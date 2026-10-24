package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionNotFoundException;
import com.blockout.backend.collection.application.model.CollectionAttempt;
import com.blockout.backend.collection.application.model.CollectionState.ServedTarget;
import com.blockout.backend.collection.application.model.CollectionState.Target;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.sporting.application.model.AcquisitionReference;
import com.blockout.backend.sporting.application.model.ClubLocalityView;
import com.blockout.backend.sporting.application.service.SportingReadService;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Adapts F02's current seasonless needs without duplicating locality/privacy persistence rules. */
@Service
@RequiredArgsConstructor
public class ClubAcquisitionService {
  private final SportingReadService sporting;
  private final CollectionStore store;

  /**
   * Reads current unresolved identities and lets a newer technical acquisition failure retry after
   * an older normal no-result. F02 remains the authority for permitted locality and valid points.
   * The returned keyset boundary includes suppressed rows so they cannot hide later eligible needs.
   *
   * @param controlId independent family's current evidence owner
   * @param geocoding municipal needs rather than club-sheet identities
   * @param manual whether this explicit passage may repeat unchanged ordinary no-results
   * @param afterId exclusive last visited club, absent for the first batch
   * @return filtered nonpersonal identities and the last scanned identity; caller applies cadence
   */
  public TargetBatch targets(UUID controlId, boolean geocoding, boolean manual, UUID afterId) {
    List<AcquisitionReference> references =
        sporting.acquisitionClubs(geocoding, manual || geocoding, afterId);
    if (references.isEmpty()) return new TargetBatch(List.of(), null);
    Set<UUID> eligible =
        references.stream().map(AcquisitionReference::clubId).collect(Collectors.toSet());
    if (geocoding && !manual) {
      eligible =
          sporting.acquisitionClubs(true, false, afterId).stream()
              .map(AcquisitionReference::clubId)
              .collect(Collectors.toSet());
      for (CollectionAttempt attempt :
          store.attempts(
              controlId, references.stream().map(AcquisitionReference::clubId).toList())) {
        if (attempt.stage() == CollectionStageEnum.GEOCODING
            && attempt.outcome() == CollectionOutcomeEnum.FAILED) eligible.add(attempt.scopeId());
      }
    }
    Set<UUID> selected = eligible;
    List<Target> targets =
        references.stream()
            .filter(reference -> selected.contains(reference.clubId()))
            .map(
                reference ->
                    Target.builder()
                        .scopeId(reference.scopeId())
                        .kind(reference.kind())
                        .clubId(reference.clubId())
                        .clubReference(reference.clubReference())
                        .provider(reference.provider())
                        .build())
            .toList();
    return new TargetBatch(targets, references.getLast().clubId());
  }

  /**
   * One bounded scan step; an empty eligible list can still advance past suppressed identities.
   *
   * @param items currently eligible nonpersonal references
   * @param lastClubId last scanned identity, null only when the owner page is exhausted
   */
  public record TargetBatch(List<Target> items, UUID lastClubId) {
    /** Detaches the eligible identity list from the current scan. */
    public TargetBatch {
      items = List.copyOf(items);
    }
  }

  /**
   * Resolves current permitted locality once per page, never from a historical season or cycle.
   *
   * @param targets bounded frozen identity page in its original order
   * @return current revisions and permitted values; null municipality forbids a provider call
   */
  public List<ServedTarget> serve(List<Target> targets) {
    List<UUID> clubIds =
        targets.stream()
            .filter(target -> target.kind() == CollectionTargetKindEnum.GEOCODING)
            .map(Target::clubId)
            .toList();
    Map<UUID, ClubLocalityView> localities = sporting.clubLocalities(clubIds);
    return targets.stream()
        .map(
            target -> {
              if (target.kind() != CollectionTargetKindEnum.GEOCODING)
                return new ServedTarget(target, null, null, null);
              ClubLocalityView locality = localities.get(target.clubId());
              if (locality == null) throw new CollectionNotFoundException();
              return new ServedTarget(
                  target,
                  locality.localityRevision(),
                  locality.municipality(),
                  locality.postalCode());
            })
        .toList();
  }
}
