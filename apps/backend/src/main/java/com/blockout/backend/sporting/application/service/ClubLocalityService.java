package com.blockout.backend.sporting.application.service;

import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.GeocodingOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.exception.SportingValidationException;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.SportingPresentation.Locality;
import com.blockout.backend.sporting.application.model.SportingPresentation.LocalityObservation;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Accepts current municipality-level results; F01 alone owns provider attempts and retry policy.
 */
@Service
@RequiredArgsConstructor
public class ClubLocalityService {
  private final SportingStore store;
  private final CollectionCycleService cycles;

  /**
   * Commits only a usable point or qualified unresolved state for the exact current context.
   * Technical failures submit no result and therefore preserve an existing point.
   *
   * @param clubId exact admitted geocoding target
   * @param observation context-qualified paired coordinates or explicit empty/ambiguous outcome
   * @return stale for obsolete context/order; rejected for an insufficient current locality
   */
  @Transactional
  public ObservationOutcome accept(UUID clubId, LocalityObservation observation) {
    validate(observation);
    cycles.requireTarget(
        observation.context().cycleId(), clubId, CollectionTargetKindEnum.GEOCODING);
    store.lockPresentation(Kind.CLUB, clubId);
    Locality current = store.locality(clubId);
    ObservationOrder order =
        new ObservationOrder(
            cycles.get(observation.context().cycleId()).cycleOrder(),
            observation.context().readOrdinal());
    String reference = store.club(clubId).orElseThrow().reference();
    ObservationOutcomeEnum status;
    if (!current.revision().equals(observation.localityRevision())
        || current.order() != null && order.compareTo(current.order()) < 0)
      status = ObservationOutcomeEnum.STALE;
    else if (current.order() != null && order.compareTo(current.order()) == 0)
      status = ObservationOutcomeEnum.UNCHANGED;
    else if (current.city() == null) status = ObservationOutcomeEnum.REJECTED;
    else {
      boolean changed =
          !Objects.equals(current.latitude(), observation.latitude())
              || !Objects.equals(current.longitude(), observation.longitude());
      store.saveLocality(clubId, observation, order);
      status = changed ? ObservationOutcomeEnum.ACCEPTED : ObservationOutcomeEnum.UNCHANGED;
    }
    return new ObservationOutcome(reference, status, clubId, null, null, null);
  }

  /**
   * Enforces the outcome/point union and bounded finite WGS84 values before effects.
   *
   * @param observation supplied current-context result
   */
  private void validate(LocalityObservation observation) {
    boolean located = observation.outcome() == GeocodingOutcomeEnum.LOCATED;
    if (located) {
      if (observation.latitude() == null
          || observation.longitude() == null
          || !Double.isFinite(observation.latitude())
          || !Double.isFinite(observation.longitude())
          || Math.abs(observation.latitude()) > 90
          || Math.abs(observation.longitude()) > 180) throw new SportingValidationException();
    } else if (observation.latitude() != null || observation.longitude() != null)
      throw new SportingValidationException();
  }
}
