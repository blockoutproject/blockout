package com.blockout.backend.sporting.application.service;

import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.StandingsPublicationStateEnum;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.SportingViews;
import com.blockout.backend.sporting.application.model.StandingsObservation;
import com.blockout.backend.sporting.application.model.StandingsView;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.sporting.domain.TeamName;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Atomic official table replacement; publication absence never erases a retained usable table. */
@Service
@RequiredArgsConstructor
public class StandingsService {
  private final SportingStore store;
  private final CollectionCycleService cycles;
  private final ClassificationService classifications;

  /**
   * Accepts current publication evidence under the F01 runtime and season locks through commit.
   *
   * @param poolId addressed admitted standings scope
   * @param observation structurally qualified table or positive absence evidence
   * @return actual scope outcome without creating teams or restoring participation
   */
  @Transactional
  public ObservationOutcome accept(UUID poolId, StandingsObservation observation) {
    CollectionState.Target target =
        cycles.requireTarget(
            observation.context().cycleId(), poolId, CollectionTargetKindEnum.STANDINGS);
    SportingViews.PoolView pool = store.pool(poolId).orElseThrow();
    ObservationOrder order =
        new ObservationOrder(
            cycles.get(observation.context().cycleId()).cycleOrder(),
            observation.context().readOrdinal());
    StandingsView previous = store.standings(poolId).orElse(null);
    if (previous != null) {
      int comparison =
          order.compareTo(new ObservationOrder(previous.cycleOrder(), previous.readOrdinal()));
      if (comparison < 0) return ObservationOutcome.refused(pool.key().reference(), true);
      if (comparison == 0) return outcome(pool, false);
    }
    if (!classifications.acceptsObservation(poolId, target))
      return ObservationOutcome.refused(pool.key().reference(), false);
    Instant observed = observation.context().observedAt().toInstant();
    Instant published =
        observation.context().providerPublishedAt() == null
            ? null
            : observation.context().providerPublishedAt().toInstant();
    StandingsView.StandingsViewBuilder next =
        previous == null
            ? StandingsView.builder().poolId(poolId).columns(List.of()).rows(List.of())
            : previous.toBuilder();
    next.cycleOrder(order.cycleOrder())
        .readOrdinal(order.readOrdinal())
        .publicationState(observation.publicationState())
        .observedAt(observed)
        .providerPublishedAt(published);
    boolean changed =
        previous == null || observation.publicationState() != previous.publicationState();
    if (observation.publicationState() == StandingsPublicationStateEnum.PUBLISHED) {
      List<SportingViews.TeamView> participants = store.currentPoolTeams(poolId);
      List<StandingsView.Row> rows =
          observation.rows().stream()
              .map(
                  row ->
                      new StandingsView.Row(
                          row.sourceName(),
                          row.nativeTeamReference(),
                          row.position(),
                          row.statistics(),
                          associate(row, participants)))
              .toList();
      changed |=
          previous == null
              || !previous.tableAvailable()
              || !previous.columns().equals(observation.columns())
              || !previous.rows().equals(rows);
      next.columns(observation.columns())
          .rows(rows)
          .tableObservedAt(observed)
          .tablePublishedAt(published);
    }
    store.saveStandings(next.build());
    return outcome(pool, changed);
  }

  /**
   * Links only one exact current participant; missing or ambiguous rows stay official but unlinked.
   *
   * @param row source row, never identity-creation authority
   * @param participants current scoped participants
   * @return exact identity, or null without unique evidence
   */
  private UUID associate(StandingsObservation.Row row, List<SportingViews.TeamView> participants) {
    List<UUID> matching =
        participants.stream()
            .filter(
                team ->
                    row.nativeTeamReference() != null
                        ? row.nativeTeamReference().equals(team.nativeReference())
                        : new TeamName(row.sourceName())
                            .comparisonKey()
                            .equals(team.comparisonName()))
            .map(SportingViews.TeamView::id)
            .toList();
    return matching.size() == 1 ? matching.getFirst() : null;
  }

  /**
   * Identifies the exact qualified pool without claiming a changed result for refreshed
   * attribution.
   *
   * @param pool qualified scope
   * @param changed whether table or publication meaning changed
   * @return safe synchronous outcome
   */
  private ObservationOutcome outcome(SportingViews.PoolView pool, boolean changed) {
    return new ObservationOutcome(
        pool.key().reference(),
        changed ? ObservationOutcomeEnum.ACCEPTED : ObservationOutcomeEnum.UNCHANGED,
        pool.id(),
        null,
        null,
        null);
  }
}
