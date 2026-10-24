package com.blockout.backend.sporting.application.service;

import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** Nontransactional bounded orchestration; each match commits through its separate Spring proxy. */
@Service
@RequiredArgsConstructor
@Slf4j
public class CalendarAcceptanceService {
  private final MatchAcceptanceService matches;

  /**
   * Preserves useful item commits and source order without replaying failed transactions.
   *
   * @param poolId globally addressed pool
   * @param observation validated bounded envelope
   * @return independent outcomes and guarded completion, never HTTP aggregate success inference
   */
  public ObservationOutcome.Calendar accept(UUID poolId, CalendarObservation observation) {
    ObservationOrder order = matches.begin(poolId, observation.context());
    Map<String, CalendarObservation.Match> distinct = new LinkedHashMap<>();
    Set<String> contradictory = new HashSet<>();
    for (CalendarObservation.Match candidate : observation.matches()) {
      CalendarObservation.Match earlier =
          distinct.putIfAbsent(candidate.nativeMatchReference(), candidate);
      if (earlier != null && !earlier.equals(candidate))
        contradictory.add(candidate.nativeMatchReference());
    }
    List<ObservationOutcome> outcomes = new ArrayList<>();
    for (CalendarObservation.Match candidate : distinct.values()) {
      if (contradictory.contains(candidate.nativeMatchReference())) {
        outcomes.add(ObservationOutcome.refused(candidate.nativeMatchReference(), false));
        continue;
      }
      try {
        outcomes.add(matches.accept(poolId, observation.context(), order, candidate));
      } catch (RuntimeException failure) {
        log.atWarn()
            .addKeyValue("operation", "sporting_match_acceptance")
            .addKeyValue("scope", poolId)
            .addKeyValue("reason", failure.getClass().getSimpleName())
            .log("Match refused; earlier commits remain accepted");
        outcomes.add(ObservationOutcome.refused(candidate.nativeMatchReference(), false));
      }
    }
    for (CalendarObservation.Failure failure : observation.failures())
      outcomes.add(ObservationOutcome.refused(failure.sourceReference(), false));
    int accepted = count(outcomes, ObservationOutcomeEnum.ACCEPTED);
    int unchanged = count(outcomes, ObservationOutcomeEnum.UNCHANGED);
    int stale = count(outcomes, ObservationOutcomeEnum.STALE);
    int rejected = count(outcomes, ObservationOutcomeEnum.REJECTED);
    boolean reconciled = false;
    if (observation.complete() && stale == 0 && rejected == 0) {
      try {
        reconciled =
            matches.finish(
                poolId,
                observation.context(),
                order,
                distinct.keySet(),
                distinct.isEmpty() && observation.contextSlots().isEmpty());
      } catch (RuntimeException failure) {
        log.atWarn()
            .addKeyValue("operation", "sporting_calendar_completion")
            .addKeyValue("scope", poolId)
            .addKeyValue("reason", failure.getClass().getSimpleName())
            .log("Calendar completion refused; earlier commits remain accepted");
      }
    }
    return new ObservationOutcome.Calendar(
        outcomes, accepted, unchanged, stale, rejected, reconciled);
  }

  /**
   * Counts actual outcomes without treating stale or refused work as accepted.
   *
   * @param outcomes independently committed outcomes
   * @param kind exact contract outcome
   * @return count in this bounded envelope
   */
  private int count(List<ObservationOutcome> outcomes, ObservationOutcomeEnum kind) {
    return (int) outcomes.stream().filter(outcome -> outcome.outcome() == kind).count();
  }
}
