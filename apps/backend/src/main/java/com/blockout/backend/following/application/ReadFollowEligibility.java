package com.blockout.backend.following.application;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Current relation identities for F07; the consumer owns sporting/account locks and delivery. */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ReadFollowEligibility {
  private final FollowStore store;

  /**
   * Groups current origins once per account without a personal display-season preference.
   *
   * @param targets actual sporting origins selected by the consumer
   * @return deeply immutable account-to-relation union
   */
  public Map<UUID, Set<FollowContext.Relation>> recipients(Set<FollowContext.Target> targets) {
    return Map.copyOf(
        store.relations(targets).stream()
            .collect(
                Collectors.groupingBy(
                    FollowContext.Relation::accountId, Collectors.toUnmodifiableSet())));
  }

  /**
   * Checks that the exact relation incarnation remains present at this read.
   *
   * @param relation previously observed original identities
   * @return false after deletion or recreation; never a guarantee about a later send
   */
  public boolean stillPresent(FollowContext.Relation relation) {
    return store
        .find(new FollowContext(relation.accountId(), relation.target()))
        .filter(current -> current.id().equals(relation.id()))
        .isPresent();
  }
}
