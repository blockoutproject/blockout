package com.blockout.backend.sporting.application;

import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
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
   * Builds the exact public resource predicate; consumers use their own selection instead.
   *
   * @param request already admitted public selector
   * @return selector over scalar match identities
   */
  ConsultationMatchSelection.Filter calendarSelection(ConsultationRequest.CalendarRequest request);

  /**
   * Selects up to eight nonempty days, including one lookahead, under the caller's transaction.
   *
   * @param request captured grouping context
   * @param selection owner-supplied scalar selection
   * @param now common classification instant
   * @return distinct ordered display days after the exclusive continuation
   */
  List<LocalDate> calendarDays(
      ConsultationRequest.CalendarWindow request,
      ConsultationMatchSelection.Filter selection,
      Instant now);

  /**
   * Reads every eligible row in the selected complete days without a match-count cap.
   *
   * @param request same category/zone used for day selection
   * @param selection same scalar selection used for day selection
   * @param days at most seven selected nonempty display days
   * @param now same classification instant as day selection
   * @return ordered detached entries from the same repeatable-read snapshot
   */
  List<CalendarEntry> calendarMatches(
      ConsultationRequest.CalendarWindow request,
      ConsultationMatchSelection.Filter selection,
      List<LocalDate> days,
      Instant now);

  /**
   * One accepted match and its PostgreSQL-derived display day, without a fabricated instant.
   *
   * @param day complete sporting day in the captured grouping context
   * @param match detached accepted values needed by the public summary
   */
  record CalendarEntry(LocalDate day, MatchInput match) {}

  /**
   * Reads current metadata for an already selected set of sporting divisions without image bytes.
   *
   * @param ids distinct accepted division identities
   * @return detached existing metadata keyed by identity
   */
  Map<UUID, DivisionDetail> divisions(Set<UUID> ids);

  /**
   * Selects current eligible pool memberships independently of table publication.
   *
   * @param poolId exact pool already admitted by the application reader
   * @return every currently viewable participating team identity
   */
  Set<UUID> participantTeamIds(UUID poolId);

  /**
   * Loads permitted municipality pairs for distinct already admitted clubs without artwork.
   *
   * @param clubIds distinct current participant clubs
   * @return detached localities; missing or restricted coordinates remain absent
   */
  Map<UUID, SportingPresentation.Locality> localities(Set<UUID> clubIds);

  /**
   * Reads accepted teams as scalar values without repeating parent or image loads per summary.
   *
   * @param ids current identities already admitted within this transaction
   * @return existing immutable teams keyed by original identity
   */
  Map<UUID, TeamView> teams(Set<UUID> ids);

  /**
   * Reads accepted contextual pools without their acquisition or image graph.
   *
   * @param ids current identities already admitted within this transaction
   * @return existing immutable pools keyed by original identity
   */
  Map<UUID, PoolView> pools(Set<UUID> ids);

  /**
   * Reads canonical season identities for the current summary selection.
   *
   * @param ids distinct season identities referenced by selected resources
   * @return existing canonical seasons keyed by identity
   */
  Map<UUID, SeasonView> seasons(Set<UUID> ids);

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
