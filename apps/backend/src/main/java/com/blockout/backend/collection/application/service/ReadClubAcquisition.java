package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionNotFoundException;
import com.blockout.backend.collection.application.model.CollectionAttempt;
import com.blockout.backend.collection.application.model.CollectionState.ServedTarget;
import com.blockout.backend.collection.application.model.CollectionState.Target;
import com.blockout.backend.collection.application.model.CollectionWorkMapper;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.sporting.application.model.ClubAcquisitionReference;
import com.blockout.backend.sporting.application.model.ClubLocalityView;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.service.ReadSportingAcquisition;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Adapts F02's current seasonless needs without duplicating locality/privacy persistence rules. */
@Service
@org.springframework.transaction.annotation.Transactional(readOnly = true)
@RequiredArgsConstructor
public class ReadClubAcquisition {
  private final ReadSportingAcquisition acquisitionReads;
  private final CollectionStore store;
  private final CollectionWorkMapper mapper;

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
    List<ClubAcquisitionReference> references =
        acquisitionReads.acquisitionClubs(geocoding, afterId);
    if (references.isEmpty()) return new TargetBatch(List.of(), null);
    Map<UUID, CollectionAttempt> attempts =
        geocoding && !manual
            ? store
                .attempts(
                    controlId, references.stream().map(ClubAcquisitionReference::clubId).toList())
                .stream()
                .filter(attempt -> attempt.stage() == CollectionStageEnum.GEOCODING)
                .collect(Collectors.toMap(CollectionAttempt::scopeId, Function.identity()))
            : Map.of();
    List<Target> targets =
        references.stream()
            .filter(
                reference ->
                    !geocoding
                        || manual
                        || needsGeocoding(reference, attempts.get(reference.clubId())))
            .map(
                reference ->
                    mapper.toTarget(
                        reference,
                        geocoding
                            ? CollectionTargetKindEnum.GEOCODING
                            : CollectionTargetKindEnum.CLUB_SHEET))
            .toList();
    return new TargetBatch(targets, references.getLast().clubId());
  }

  /**
   * Preserves F02's current normal result unless a later technical attempt requires another read.
   *
   * @param reference current owner metadata without personal locality
   * @param attempt latest F01 geocoding acquisition evidence, absent before the first record
   * @return true for a fresh need or a failure newer than F02's last accepted normal result
   */
  private boolean needsGeocoding(ClubAcquisitionReference reference, CollectionAttempt attempt) {
    if (!reference.normalLocalityResult()) return true;
    return attempt != null
        && attempt.outcome() == CollectionOutcomeEnum.FAILED
        && (reference.localityOrder() == null
            || new ObservationOrder(attempt.cycleOrder(), attempt.readOrdinal())
                    .compareTo(reference.localityOrder())
                > 0);
  }

  /**
   * One bounded scan step; an empty eligible list can still advance past suppressed identities.
   *
   * @param items currently eligible nonpersonal references
   * @param lastClubId last scanned identity, null only when the owner page is exhausted
   */
  public record TargetBatch(List<Target> items, UUID lastClubId) {
    /**
     * Detaches the eligible identity list from the current scan.
     *
     * @param items currently eligible nonpersonal references
     * @param lastClubId last scanned identity, null at exhaustion
     */
    public TargetBatch {
      items = List.copyOf(items);
    }
  }

  /**
   * Resolves current permitted locality once per page, never from a historical season or cycle.
   *
   * @param targets bounded frozen identity page in its original order
   * @return current revisions and permitted values; null municipality forbids a provider call
   * @throws CollectionNotFoundException when a geocoding target has no current owner locality
   */
  public List<ServedTarget> serve(List<Target> targets) {
    List<UUID> clubIds =
        targets.stream()
            .filter(target -> target.kind() == CollectionTargetKindEnum.GEOCODING)
            .map(Target::clubId)
            .toList();
    Map<UUID, ClubLocalityView> localities = acquisitionReads.clubLocalities(clubIds);
    return targets.stream()
        .map(
            target -> {
              if (target.kind() != CollectionTargetKindEnum.GEOCODING)
                return mapper.toServedTarget(target, null);
              ClubLocalityView locality = localities.get(target.clubId());
              if (locality == null) throw new CollectionNotFoundException();
              return mapper.toServedTarget(target, locality);
            })
        .toList();
  }
}
