package com.blockout.backend.sporting.application.service;

import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.CollectionCycleAccess;
import com.blockout.backend.collection.application.service.CollectionCycleAccess.AdmittedScope;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.notifications.application.AfterCommitAnnouncements;
import com.blockout.backend.notifications.application.ProcessResultAnnouncement;
import com.blockout.backend.notifications.application.ProcessResultAnnouncement.Transition;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.CalendarState;
import com.blockout.backend.sporting.application.model.MatchDetails;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.MatchObservation.Result;
import com.blockout.backend.sporting.application.model.MatchSchedule;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.sporting.domain.MatchFacts;
import com.blockout.backend.sporting.domain.SportingReferences;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Separately proxied match transactions retain F01's runtime fence through each domain commit. */
@Service
@Slf4j
@RequiredArgsConstructor
public class AcceptMatchObservation {
  private final SportingStore store;
  private final CollectionCycleAccess cycleAccess;
  private final EstablishMatchIdentity identities;
  private final CheckAcquisitionClassification acquisitionClassification;
  private final MatchContributionAccess contributionContext;
  private final ProcessResultAnnouncement announcements;
  private final AfterCommitAnnouncements handoff;
  private final Clock clock;

  /**
   * Qualifies the global envelope and advances its pool order before any item commit.
   *
   * @param poolId addressed admitted pool
   * @param context submitted read attribution
   * @return resolved token; an older token is returned without advancing current state
   */
  @Transactional
  public ObservationOrder begin(UUID poolId, MatchObservation.Context context) {
    AdmittedScope<CollectionState.Target> admission =
        cycleAccess.requireTarget(context.cycleId(), poolId, CollectionTargetKindEnum.CALENDAR);
    ObservationOrder order = context.order(admission.cycle().cycleOrder());
    CalendarState state = store.calendarState(poolId);
    if (state.current() == null || order.compareTo(state.current()) > 0) {
      store.beginCalendar(poolId, order);
    }
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
    AdmittedScope<CollectionState.Target> admission =
        cycleAccess.requireTarget(context.cycleId(), poolId, CollectionTargetKindEnum.CALENDAR);
    CollectionState.Target target = admission.scope();
    CalendarState state = store.calendarState(poolId);
    if (!expected.equals(state.current())) {
      return ObservationOutcome.refused(candidate.nativeMatchReference(), true);
    }
    ObservationOrder previous = store.matchOrder(poolId, candidate.nativeMatchReference());
    if (previous != null && expected.compareTo(previous) < 0) {
      return ObservationOutcome.refused(candidate.nativeMatchReference(), true);
    }
    if (expected.equals(state.completed()) && !expected.equals(previous)) {
      return ObservationOutcome.refused(candidate.nativeMatchReference(), true);
    }
    if (!acquisitionClassification.acceptsObservation(poolId, target)) {
      return ObservationOutcome.refused(candidate.nativeMatchReference(), false);
    }
    if (previous != null && expected.equals(previous)) {
      return success(
          store.match(poolId, candidate.nativeMatchReference()).orElseThrow(), false, null, false);
    }
    if (store.pool(poolId).orElseThrow().classification() == null) {
      store.correctClassification(
          List.of(poolId),
          List.of(),
          new SportingClassification(target.divisionId(), target.format(), target.gender()));
    }
    contributionContext.lockDivisionForPool(poolId);
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
    if (created) {
      schedule = store.lockMatchSchedule(match.id());
    }
    boolean restored = store.restoreCalendarPresence(match.id());
    boolean scheduleChanged =
        acceptSchedule(schedule, expected, context, candidate.facts(), candidate.detailUrl());
    return acceptDetails(
        match,
        context,
        candidate.facts(),
        created,
        admission.cycle().mode(),
        created || namesChanged || restored || scheduleChanged);
  }

  /**
   * Reconciles absence only after still-current successful processing. Empty initial reconstruction
   * preserves retained history; an already completed token cannot reconcile twice.
   *
   * @param poolId qualified pool
   * @param context original read attribution
   * @param expected original logical token
   * @param presentReferences exact successful native encounter references
   * @param empty whether the qualified calendar has no matches or context slots
   * @return whether current completion was recorded
   */
  @Transactional
  public boolean finish(
      UUID poolId,
      MatchObservation.Context context,
      ObservationOrder expected,
      Set<String> presentReferences,
      boolean empty) {
    AdmittedScope<CollectionState.Target> admission =
        cycleAccess.requireTarget(context.cycleId(), poolId, CollectionTargetKindEnum.CALENDAR);
    CalendarState state = store.calendarState(poolId);
    if (!expected.equals(state.current())
        || !acquisitionClassification.acceptsObservation(poolId, admission.scope())) {
      return false;
    }
    if (empty && admission.cycle().mode() == CollectionModeEnum.INITIAL_IMPORT) {
      return false;
    }
    if (expected.equals(state.completed())) {
      return false;
    }
    store.completeCalendar(poolId, expected, presentReferences, empty);
    return true;
  }

  /**
   * Projects actual stable identities with a field-change result.
   *
   * @param match accepted identity
   * @param changed whether owned state changed
   * @param created whether calendar identification created the match, absent for detail or replay
   * @param finalResultChanged whether this transaction accepted a new or corrected final result
   * @return successful contract-shaped application outcome
   */
  private ObservationOutcome success(
      SportingViews.MatchView match, boolean changed, Boolean created, boolean finalResultChanged) {
    return new ObservationOutcome(
        match.reference(),
        changed ? ObservationOutcomeEnum.ACCEPTED : ObservationOutcomeEnum.UNCHANGED,
        match.id(),
        null,
        match.homeTeamId(),
        match.awayTeamId(),
        created,
        finalResultChanged);
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
    Instant published = context.providerPublishedAt();
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
          .reliableStart(MatchFacts.resolveStart(date, time, zone))
          .scheduleObservedAt(context.observedAt())
          .schedulePublishedAt(published);
    }
    if (detailUrl != null) {
      changed |= !detailUrl.toString().equals(previous.detailUrl());
      next.detailUrl(detailUrl.toString())
          .referenceObservedAt(context.observedAt())
          .referencePublishedAt(published);
    }
    store.saveMatchSchedule(next.build());
    return changed;
  }

  /**
   * Enriches only an already-known encounter without identifying teams or restoring participation.
   *
   * @param observation known match and original read attribution
   * @return independent logical-order outcome for the supplied schedule and detail proposals
   */
  @Transactional
  public ObservationOutcome detail(MatchObservation observation) {
    // Project only the immutable parent so a wait on F01 cannot leave cached mutable match state.
    UUID poolId =
        store
            .matchPoolId(observation.matchId())
            .orElseThrow(SportingResourceNotFoundException::new);
    AdmittedScope<CollectionState.Target> admission =
        cycleAccess.requireDetail(observation.context().cycleId(), observation.matchId(), poolId);
    SportingViews.MatchView match =
        store.match(observation.matchId()).orElseThrow(SportingResourceNotFoundException::new);
    ObservationOrder expected = observation.context().order(admission.cycle().cycleOrder());
    ObservationOrder current = store.calendarState(match.poolId()).current();
    ObservationOrder previous = store.matchOrder(match.poolId(), match.reference());
    if ((current != null && expected.compareTo(current) < 0)
        || (previous != null && expected.compareTo(previous) < 0)) {
      return ObservationOutcome.refused(match.reference(), true);
    }
    if (!acquisitionClassification.acceptsObservation(match.poolId(), admission.scope())) {
      return ObservationOutcome.refused(match.reference(), false);
    }
    if (expected.equals(previous)) {
      return success(match, false, null, false);
    }
    contributionContext.lockDivisionForPool(match.poolId());
    boolean scheduleChanged =
        acceptSchedule(
            store.lockMatchSchedule(match.id()),
            expected,
            observation.context(),
            observation.facts(),
            null);
    return acceptDetails(
        match,
        observation.context(),
        observation.facts(),
        null,
        admission.cycle().mode(),
        scheduleChanged);
  }

  /**
   * Accepts independent enrichment groups; invalid detail never discards an official overall
   * result.
   *
   * @param match encounter already locked by the enclosing transaction
   * @param context source attribution, never precedence
   * @param created whether this calendar item identified the encounter, absent on a detail read
   * @param facts supplied proposals with native presence semantics
   * @param mode admitted cycle mode controlling result announcements
   * @param changed whether identity, calendar presence or schedule already changed
   * @return the accepted match outcome, independently of refreshed provenance
   */
  private ObservationOutcome acceptDetails(
      SportingViews.MatchView match,
      MatchObservation.Context context,
      MatchObservation.Facts facts,
      Boolean created,
      CollectionModeEnum mode,
      boolean changed) {
    UUID matchId = match.id();
    MatchDetails previous = store.matchDetails(matchId);
    MatchDetails.MatchDetailsBuilder next = previous.toBuilder();
    Instant observed = context.observedAt();
    Instant published = context.providerPublishedAt();
    Result result = previous.result();
    boolean finalResultChanged = false;
    if (facts.result().isPresent()) {
      Result proposal = facts.result().get();
      if (proposal == null
          || MatchFacts.usableResult(
              proposal.homeSets(), proposal.awaySets(), proposal.specialLabel())) {
        result = proposal;
        boolean resultChanged = !Objects.equals(previous.result(), result);
        finalResultChanged = resultChanged && Result.isFinal(result);
        changed |= resultChanged || previous.uninterpretedResult() != null;
        next.result(result)
            .uninterpretedResult(null)
            .resultObservedAt(observed)
            .resultPublishedAt(published);
      } else {
        String label = proposal.specialLabel();
        if (label != null) {
          next.uninterpretedResult(label.substring(0, Math.min(label.length(), 256)));
        }
        diagnose(matchId, "uninterpreted-result");
      }
    }
    List<MatchFacts.SetScore> sets = previous.sets();
    boolean withdrawal = facts.result().isPresent() && facts.result().get() == null;
    if (withdrawal || (facts.sets().isPresent() && facts.sets().get() == null)) {
      sets = null;
      next.setsObservedAt(observed).setsPublishedAt(published);
    } else if (facts.sets().isPresent()) {
      List<MatchFacts.SetScore> proposed = facts.sets().get();
      if (compatible(result, proposed)) {
        sets = proposed;
        next.setsObservedAt(observed).setsPublishedAt(published);
      } else {
        diagnose(matchId, "incompatible-sets");
      }
    }
    if (sets != null && !compatible(result, sets)) {
      sets = null;
      next.setsObservedAt(observed).setsPublishedAt(published);
    }
    changed |= !Objects.equals(previous.sets(), sets);
    next.sets(sets);
    if (facts.venueName().isPresent() || facts.venueAddress().isPresent()) {
      String name = facts.venueName().isPresent() ? facts.venueName().get() : previous.venueName();
      String address =
          facts.venueAddress().isPresent() ? facts.venueAddress().get() : previous.venueAddress();
      changed |=
          !Objects.equals(previous.venueName(), name)
              || !Objects.equals(previous.venueAddress(), address);
      next.venueName(name)
          .venueAddress(address)
          .venueObservedAt(observed)
          .venuePublishedAt(published);
    }
    if (facts.referees().isPresent()) {
      changed |= !Objects.equals(previous.referees(), facts.referees().get());
      next.referees(facts.referees().get())
          .refereesObservedAt(observed)
          .refereesPublishedAt(published);
    }
    if (facts.professionalStreamUrl().isPresent()) {
      URI value = facts.professionalStreamUrl().get();
      if (SportingReferences.qualified(value)) {
        String url = value == null ? null : value.toString();
        changed |= !Objects.equals(previous.professionalStreamUrl(), url);
        next.professionalStreamUrl(url).streamObservedAt(observed).streamPublishedAt(published);
      } else {
        diagnose(matchId, "invalid-stream-reference");
      }
    }
    boolean documents = false;
    // An auxiliary lookup cannot replace an established code; a named withdrawal still removes it.
    boolean establishedProfessionalCode =
        previous.informationSheet() != null
            && "AALNV".equals(previous.informationSheet().organizerReference());
    if (facts.informationSheet().isPresent()
        && (!establishedProfessionalCode
            || facts.informationSheet().get() == null
            || Objects.equals(previous.informationSheet(), facts.informationSheet().get()))) {
      changed |= !Objects.equals(previous.informationSheet(), facts.informationSheet().get());
      next.informationSheet(facts.informationSheet().get());
      documents = true;
    }
    if (facts.scoresheetUrl().isPresent()) {
      URI value = facts.scoresheetUrl().get();
      if (SportingReferences.qualified(value)) {
        String url = value == null ? null : value.toString();
        changed |= !Objects.equals(previous.scoresheetUrl(), url);
        next.scoresheetUrl(url);
        documents = true;
      } else {
        diagnose(matchId, "invalid-scoresheet-reference");
      }
    }
    if (facts.statisticsUrl().isPresent()) {
      URI value = facts.statisticsUrl().get();
      if (SportingReferences.qualified(value)) {
        String url = value == null ? null : value.toString();
        changed |= !Objects.equals(previous.statisticsUrl(), url);
        next.statisticsUrl(url);
        documents = true;
      } else {
        diagnose(matchId, "invalid-statistics-reference");
      }
    }
    if (documents) {
      next.documentsObservedAt(observed).documentsPublishedAt(published);
    }
    store.saveMatchDetails(next.build());
    // An earlier final still needs F07 processing when it is withdrawn or replaced.
    if (Result.isFinal(previous.result()) || Result.isFinal(result)) {
      handoff.submit(
          announcements.process(
              new Transition(
                  match,
                  previous.result(),
                  result,
                  Boolean.TRUE.equals(created),
                  mode == CollectionModeEnum.INITIAL_IMPORT,
                  clock.instant())));
    }
    return success(match, changed, created, finalResultChanged);
  }

  /**
   * Requires numeric overall totals before exposing compatible played-set detail.
   *
   * @param result current authoritative result, possibly absent or special
   * @param sets supplied or retained detail
   * @return whether the two groups describe the same score
   */
  private boolean compatible(Result result, List<MatchFacts.SetScore> sets) {
    return result != null
        && result.specialLabel() == null
        && MatchFacts.compatibleSets(result.homeSets(), result.awaySets(), sets);
  }

  /**
   * Records an isolated degraded group without logging provider values or personal details.
   *
   * @param matchId safe affected identity
   * @param reason fixed bounded diagnostic category
   */
  private void diagnose(UUID matchId, String reason) {
    log.atWarn()
        .addKeyValue("operation", "sporting_fact_acceptance")
        .addKeyValue("scope", matchId)
        .addKeyValue("reason", reason)
        .log("Invalid secondary facts preserve usable accepted state");
  }
}
