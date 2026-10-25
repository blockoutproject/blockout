package com.blockout.backend.sporting.application;

import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Detached database inputs for public consultation; application reads own admission and
 * composition.
 */
public interface ConsultationStore {
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
