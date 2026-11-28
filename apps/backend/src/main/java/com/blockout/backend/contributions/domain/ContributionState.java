package com.blockout.backend.contributions.domain;

import java.util.UUID;

/**
 * Match-local contribution revision and unresolved report hold; no stored activity/quota counter.
 *
 * @param matchId F02 identity
 * @param revision editing revision, compared under the owning match lock
 * @param reportHoldVersionId hidden version requiring moderation, or null
 */
public record ContributionState(UUID matchId, long revision, UUID reportHoldVersionId) {
  /**
   * Represents an absent persistent state without creating a row on a read.
   *
   * @param matchId existing F02 match
   * @return initial revision and no report hold
   */
  public static ContributionState initial(UUID matchId) {
    return new ContributionState(matchId, 0, null);
  }
}
