package com.blockout.backend.notifications.domain;

import java.util.Objects;
import java.util.UUID;

/**
 * Minimal nonpersonal allowances protected by F02's match lock and retained after personal purge.
 *
 * @param matchId original F02 identity
 * @param liveProcessed consumed live category
 * @param resultProcessed consumed result category, including silent discovery/reconstruction
 * @param postResultProcessed consumed post-result category
 * @param resultComposition fixed result family, absent before result processing
 */
public record MatchAnnouncementFacts(
    UUID matchId,
    boolean liveProcessed,
    boolean resultProcessed,
    boolean postResultProcessed,
    NotificationFamily resultComposition) {
  /**
   * Requires a result composition exactly when the result category has been processed.
   *
   * @param matchId required original match
   * @param liveProcessed live allowance
   * @param resultProcessed result allowance
   * @param postResultProcessed post-result allowance
   * @param resultComposition plain/enriched result only, or null before processing
   */
  public MatchAnnouncementFacts {
    Objects.requireNonNull(matchId);
    if (resultProcessed != (resultComposition != null)
        || (resultComposition != null
            && resultComposition != NotificationFamily.PLAIN_RESULT
            && resultComposition != NotificationFamily.ENRICHED_RESULT)
        || (resultComposition == NotificationFamily.ENRICHED_RESULT && !postResultProcessed)) {
      throw new IllegalArgumentException("Inconsistent result composition");
    }
  }

  /**
   * Represents a match with no processed announcement category.
   *
   * @param matchId retained sporting identity
   * @return unconsumed facts
   */
  public static MatchAnnouncementFacts empty(UUID matchId) {
    return new MatchAnnouncementFacts(matchId, false, false, false, null);
  }

  /**
   * Consumes live independently from either result category.
   *
   * @return facts retaining every previous allowance
   */
  public MatchAnnouncementFacts consumeLive() {
    return new MatchAnnouncementFacts(
        matchId, true, resultProcessed, postResultProcessed, resultComposition);
  }

  /**
   * Consumes a later accepted publication without altering the original result composition.
   *
   * @return facts retaining every previous allowance
   */
  public MatchAnnouncementFacts consumePostResultLink() {
    return new MatchAnnouncementFacts(
        matchId, liveProcessed, resultProcessed, true, resultComposition);
  }

  /**
   * Fixes composition once, consuming replay with an enriched result; repeats preserve all facts.
   *
   * @param family selected plain/enriched composition under the match lock
   * @return monotone processed facts
   */
  public MatchAnnouncementFacts consumeResult(NotificationFamily family) {
    if (resultProcessed) return this;
    return new MatchAnnouncementFacts(
        matchId,
        liveProcessed,
        true,
        postResultProcessed || family == NotificationFamily.ENRICHED_RESULT,
        family);
  }
}
