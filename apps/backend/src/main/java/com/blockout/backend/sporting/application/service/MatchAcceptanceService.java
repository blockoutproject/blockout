package com.blockout.backend.sporting.application.service;

import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.CalendarState;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.MatchSchedule;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.net.URI;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Separately proxied match transactions retain F01's runtime fence through each domain commit. */
@Service
@RequiredArgsConstructor
public class MatchAcceptanceService {
  private final SportingStore store;
  private final CollectionCycleService cycles;
  private final SportingIdentityService identities;

  /**
   * Qualifies the global envelope and advances its pool order before any item commit.
   *
   * @param poolId addressed admitted pool
   * @param context submitted read attribution
   * @return resolved token; an older token is returned without advancing current state
   */
  @Transactional
  public ObservationOrder begin(UUID poolId, MatchObservation.Context context) {
    cycles.requireTarget(context.cycleId(), poolId, CollectionTargetKindEnum.CALENDAR);
    ObservationOrder order = order(context);
    CalendarState state = store.calendarState(poolId);
    if (state.current() == null || order.compareTo(state.current()) > 0)
      store.beginCalendar(poolId, order);
    return order;
  }

  /**
   * Commits one attributable encounter, refusing superseded work before identity creation.
   *
   * @param poolId admitted contextual pool
   * @param context original read attribution
   * @param expected backend-resolved token from admission
   * @param candidate one distinct noncontradictory source encounter
   * @return accepted, unchanged, stale or locally rejected result
   */
  @Transactional
  public ObservationOutcome accept(
      UUID poolId,
      MatchObservation.Context context,
      ObservationOrder expected,
      CalendarObservation.Match candidate) {
    CollectionState.Target target =
        cycles.requireTarget(context.cycleId(), poolId, CollectionTargetKindEnum.CALENDAR);
    if (!expected.equals(store.calendarState(poolId).current()))
      return ObservationOutcome.refused(candidate.nativeMatchReference(), true);
    ObservationOrder previous = store.matchOrder(poolId, candidate.nativeMatchReference());
    if (previous != null && expected.compareTo(previous) < 0)
      return ObservationOutcome.refused(candidate.nativeMatchReference(), true);
    if (expected.equals(store.calendarState(poolId).completed()) && !expected.equals(previous))
      return ObservationOutcome.refused(candidate.nativeMatchReference(), true);
    if (!eligible(poolId, target))
      return ObservationOutcome.refused(candidate.nativeMatchReference(), false);
    if (previous != null && expected.equals(previous)) {
      return success(store.match(poolId, candidate.nativeMatchReference()).orElseThrow(), false);
    }
    if (store.pool(poolId).orElseThrow().classification() == null)
      store.correctClassification(
          List.of(poolId),
          List.of(),
          new SportingClassification(target.divisionId(), target.format(), target.gender()));
    SportingViews.MatchView existing =
        store.match(poolId, candidate.nativeMatchReference()).orElse(null);
    boolean created = existing == null;
    boolean namesChanged = false;
    MatchSchedule schedule = null;
    if (existing != null) {
      schedule = store.lockMatchSchedule(existing.id());
      SportingViews.TeamView home = store.team(existing.homeTeamId()).orElseThrow();
      SportingViews.TeamView away = store.team(existing.awayTeamId()).orElseThrow();
      namesChanged =
          !home.sourceName().equals(candidate.home().sourceName())
              || !away.sourceName().equals(candidate.away().sourceName());
    }
    SportingViews.MatchView match =
        identities.identifyMatch(
            poolId, candidate.nativeMatchReference(), candidate.home(), candidate.away());
    if (created) schedule = store.lockMatchSchedule(match.id());
    boolean changed =
        acceptSchedule(schedule, expected, context, candidate.facts(), candidate.detailUrl());
    return success(match, created || namesChanged || changed);
  }

  /**
   * Recognizes only a still-current fully processed calendar as completed. Public absence effects
   * remain with the following lifecycle increment; this method does not claim those effects.
   *
   * @param poolId qualified pool
   * @param context original read attribution
   * @param expected original logical token
   * @param empty whether the qualified calendar has no matches or context slots
   * @return whether current completion was recorded
   */
  @Transactional
  public boolean finish(
      UUID poolId, MatchObservation.Context context, ObservationOrder expected, boolean empty) {
    CollectionState.Target target =
        cycles.requireTarget(context.cycleId(), poolId, CollectionTargetKindEnum.CALENDAR);
    CalendarState state = store.calendarState(poolId);
    if (!expected.equals(state.current()) || !eligible(poolId, target)) return false;
    if (empty && cycles.get(context.cycleId()).mode() == CollectionModeEnum.INITIAL_IMPORT)
      return false;
    if (!expected.equals(state.completed())) store.completeCalendar(poolId, expected);
    return true;
  }

  /**
   * Resolves precedence from the admitted backend cycle rather than client-supplied timestamps.
   *
   * @param context validated context
   * @return authoritative logical token
   */
  private ObservationOrder order(MatchObservation.Context context) {
    return new ObservationOrder(cycles.get(context.cycleId()).cycleOrder(), context.readOrdinal());
  }

  /**
   * Projects actual stable identities with a field-change result.
   *
   * @param match accepted identity
   * @param changed whether owned state changed
   * @return successful contract-shaped application outcome
   */
  private ObservationOutcome success(SportingViews.MatchView match, boolean changed) {
    return new ObservationOutcome(
        match.reference(),
        changed ? ObservationOutcomeEnum.ACCEPTED : ObservationOutcomeEnum.UNCHANGED,
        match.id(),
        null,
        match.homeTeamId(),
        match.awayTeamId());
  }

  /**
   * Applies only supplied schedule/reference groups; retained groups retain their old attribution.
   *
   * @param previous current schedule obtained under the retained match lock
   * @param order authoritative token
   * @param context actual source timestamps
   * @param facts independent submitted proposals
   * @param detailUrl qualified reference, null preserves
   * @return whether sporting schedule/reference values changed
   */
  private boolean acceptSchedule(
      MatchSchedule previous,
      ObservationOrder order,
      MatchObservation.Context context,
      MatchObservation.Facts facts,
      URI detailUrl) {
    MatchSchedule.MatchScheduleBuilder next =
        previous.toBuilder()
            .acceptedCycleOrder(order.cycleOrder())
            .acceptedReadOrdinal(order.readOrdinal());
    Instant published =
        context.providerPublishedAt() == null ? null : context.providerPublishedAt().toInstant();
    boolean changed = false;
    if (facts.localDate().isPresent()
        || facts.localTime().isPresent()
        || facts.timeZone() != null) {
      LocalDate date =
          facts.localDate().isPresent() ? facts.localDate().get() : previous.localDate();
      String time = facts.localTime().isPresent() ? facts.localTime().get() : previous.localTime();
      String zone = facts.timeZone() != null ? facts.timeZone() : previous.timeZone();
      changed =
          !Objects.equals(date, previous.localDate())
              || !Objects.equals(time, previous.localTime())
              || !Objects.equals(zone, previous.timeZone());
      next.localDate(date)
          .localTime(time)
          .timeZone(zone)
          .reliableStart(resolveStart(date, time, zone))
          .scheduleObservedAt(context.observedAt().toInstant())
          .schedulePublishedAt(published);
    }
    if (detailUrl != null) {
      changed |= !detailUrl.toString().equals(previous.detailUrl());
      next.detailUrl(detailUrl.toString())
          .referenceObservedAt(context.observedAt().toInstant())
          .referencePublishedAt(published);
    }
    store.saveMatchSchedule(next.build());
    return changed;
  }

  /**
   * Resolves only one valid offset; DST gaps and overlaps do not invent an instant.
   *
   * @param date supplied date, possibly unknown
   * @param time supplied time, possibly unknown
   * @param zone supplied source zone, possibly unknown
   * @return unique instant or null without sufficient evidence
   */
  private Instant resolveStart(LocalDate date, String time, String zone) {
    if (date == null || time == null || zone == null) return null;
    try {
      LocalDateTime local = LocalDateTime.of(date, LocalTime.parse(time));
      List<ZoneOffset> offsets = ZoneId.of(zone).getRules().getValidOffsets(local);
      return offsets.size() == 1 ? local.toInstant(offsets.getFirst()) : null;
    } catch (DateTimeException invalid) {
      return null;
    }
  }

  /**
   * Enriches only an already-known encounter without identifying teams or restoring participation.
   *
   * @param observation known match and original read attribution
   * @return independent logical-order outcome for the supplied schedule proposals
   */
  @Transactional
  public ObservationOutcome detail(MatchObservation observation) {
    // Project only the immutable parent so a wait on F01 cannot leave cached mutable match state.
    UUID poolId =
        store
            .matchPoolId(observation.matchId())
            .orElseThrow(SportingResourceNotFoundException::new);
    CollectionState.Target target =
        cycles.requireDetail(observation.context().cycleId(), observation.matchId(), poolId);
    SportingViews.MatchView match =
        store.match(observation.matchId()).orElseThrow(SportingResourceNotFoundException::new);
    ObservationOrder expected = order(observation.context());
    ObservationOrder current = store.calendarState(match.poolId()).current();
    ObservationOrder previous = store.matchOrder(match.poolId(), match.reference());
    if ((current != null && expected.compareTo(current) < 0)
        || (previous != null && expected.compareTo(previous) < 0))
      return ObservationOutcome.refused(match.reference(), true);
    if (!eligible(match.poolId(), target))
      return ObservationOutcome.refused(match.reference(), false);
    if (expected.equals(previous)) return success(match, false);
    return success(
        match,
        acceptSchedule(
            store.lockMatchSchedule(match.id()),
            expected,
            observation.context(),
            observation.facts(),
            null));
  }

  /**
   * Checks current acquisition classification against the admitted snapshot without restoring it.
   *
   * @param poolId existing pool
   * @param target backend-frozen acquisition classification
   * @return whether this observation remains compatible with current manual settings
   */
  private boolean eligible(UUID poolId, CollectionState.Target target) {
    SportingViews.PoolClassificationView classification =
        store.poolClassification(poolId).orElseThrow();
    SportingClassification current =
        classification.setting() == null
            ? store.pack(classification.pool().packId()).orElseThrow().setting()
            : classification.setting();
    SportingClassification admitted =
        new SportingClassification(target.divisionId(), target.format(), target.gender());
    return current != null
        && current.equals(admitted)
        && (classification.pool().classification() == null
            || current.equals(classification.pool().classification()));
  }
}
