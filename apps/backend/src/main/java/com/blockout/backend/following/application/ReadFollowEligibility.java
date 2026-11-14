package com.blockout.backend.following.application;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
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
    return store.relations(targets).stream()
        .map(FollowContext.Relation::accountId)
        .collect(Collectors.toUnmodifiableSet());
  }

  /**
   * Checks the original account's current follow, independently of relation recreation.
   *
   * @param context original account and current qualifying sporting target
   * @return whether the account currently follows that target
   */
  public boolean following(FollowContext context) {
    return store.find(context).isPresent();
  }
}
