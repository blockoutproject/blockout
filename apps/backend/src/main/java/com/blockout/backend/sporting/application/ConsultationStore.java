package com.blockout.backend.sporting.application;

import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Detached database inputs for public consultation; application reads own admission and
 * composition.
 */
public interface ConsultationStore {
  /**
   * Selects up to eight nonempty days, including one lookahead, under the caller's transaction.
   *
   * @param request admitted selector and captured grouping context
   * @param now common classification instant
   * @return distinct ordered display days after the exclusive continuation
   */
  List<LocalDate> calendarDays(ConsultationRequest.CalendarRequest request, Instant now);

  /**
   * Reads every eligible row in the selected complete days without a match-count cap.
   *
   * @param request same admitted selector/category/zone used for day selection
   * @param days at most seven selected nonempty display days
   * @param now same classification instant as day selection
   * @return ordered detached entries from the same repeatable-read snapshot
   */
  List<CalendarEntry> calendarMatches(
      ConsultationRequest.CalendarRequest request, List<LocalDate> days, Instant now);

  /** One accepted match and its PostgreSQL-derived display day, without a fabricated instant. */
  record CalendarEntry(LocalDate day, MatchInput match) {}

  /**
   * Reads current metadata for an already selected set of sporting divisions without image bytes.
   *
   * @param ids distinct accepted division identities
   * @return detached existing metadata keyed by identity
   */
  Map<UUID, DivisionDetail> divisions(Set<UUID> ids);

  /**
   * Loads the to-one graph of already admitted dated matches in one bounded query.
   *
   * @param ids current match identities selected under the caller's consistent read transaction
   * @return detached sporting inputs; this operation does not authorize the selection
   */
  Map<UUID, MatchInput> matches(Set<UUID> ids);

  /**
   * Accepted owner values needed to compose one public match without exposing persistence objects.
   *
   * @param id original match identity
   * @param poolId retained contextual pool
   * @param homeTeamId original home participant
   * @param awayTeamId original away participant
   * @param season canonical pool season
   * @param classification accepted pool classification
   * @param division current classification metadata
   * @param schedule independently attributed current schedule
   * @param result accepted official result, or absent
   * @param resultObservedAt independent result observation time
   */
  record MatchInput(
      UUID id,
      UUID poolId,
      UUID homeTeamId,
      UUID awayTeamId,
      SeasonView season,
      SportingClassification classification,
      DivisionDetail division,
      ConsultationViews.Schedule schedule,
      MatchObservation.Result result,
      Instant resultObservedAt) {}
}
