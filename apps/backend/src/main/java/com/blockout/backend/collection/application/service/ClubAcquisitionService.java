package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionNotFoundException;
import com.blockout.backend.collection.application.model.CollectionState.ServedTarget;
import com.blockout.backend.collection.application.model.CollectionState.Target;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.sporting.application.model.ClubLocalityView;
import com.blockout.backend.sporting.application.service.SportingReadService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Adapts F02's current seasonless needs without duplicating locality/privacy persistence rules. */
@Service
@RequiredArgsConstructor
public class ClubAcquisitionService {
  private final SportingReadService sporting;

  /**
   * Reads one bounded keyset batch of encountered clubs or current unresolved localities. F02
   * excludes valid points even on an explicit rerun and suppresses unchanged normal no-results.
   *
   * @param geocoding current municipal needs rather than club-sheet identities
   * @param manual whether this explicitly requested passage may retry ordinary unresolved results
   * @param afterId exclusive last visited club, absent for the first batch
   * @return nonpersonal references only; caller applies cadence and freezes selected identities
   */
  public List<Target> targets(boolean geocoding, boolean manual, UUID afterId) {
    return sporting.acquisitionClubs(geocoding, manual, afterId).stream()
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
