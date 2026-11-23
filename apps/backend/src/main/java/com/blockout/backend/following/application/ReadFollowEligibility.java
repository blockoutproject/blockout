package com.blockout.backend.following.application;

import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Current confirmed follows for F07; the consumer owns sporting visibility and delivery. */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ReadFollowEligibility {
  private final FollowStore store;

  /**
   * Selects each current follower once, independently of personal display-season preferences.
   *
   * @param targets actual sporting origins selected by the consumer
   * @return immutable account union
   */
  public Set<UUID> recipients(Set<FollowContext.Target> targets) {
    return store.recipients(targets);
  }

  /**
   * Checks the selected account's qualifying follow within the caller's current match snapshot.
   *
   * @param accountId original selected account
   * @param homeTeamId current home team
   * @param awayTeamId current away team
   * @param poolId current match pool
   * @return whether the account follows at least one of these origins
   */
  public boolean followsMatch(UUID accountId, UUID homeTeamId, UUID awayTeamId, UUID poolId) {
    return store.followsMatch(accountId, homeTeamId, awayTeamId, poolId);
  }
}
