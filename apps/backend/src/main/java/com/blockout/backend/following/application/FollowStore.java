package com.blockout.backend.following.application;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** Relation persistence; writes participate in the caller's original-account lock/transaction. */
public interface FollowStore {
  /**
   * Reads the exact original owner's typed relation, including retained hidden targets.
   *
   * @param context original account and target
   * @return the current relation, or absence without a negative-state row
   */
  Optional<Relation> find(FollowContext context);

  /**
   * Creates one relation after the caller verified absence under the original account lock.
   *
   * @param context locked usable original account and currently viewable target
   */
  void add(FollowContext context);

  /**
   * Removes only this original account's typed relation; absence has no effect.
   *
   * @param context locked usable account and exact target
   */
  void remove(FollowContext context);

  /**
   * Reads confirmed relations for the supplied sporting origins, without display-season filtering.
   *
   * @param targets the actual consumer's team/pool origins, possibly empty
   * @return detached identities of currently present relations
   */
  List<Relation> relations(Set<FollowContext.Target> targets);

  /**
   * Immutable original account, sporting target and relation lifecycle for in-process consumers.
   *
   * @param id unique relation incarnation, replaced after unfollow/re-follow
   * @param accountId original account protected by the relation's FK
   * @param target exact typed sporting identity
   */
  record Relation(UUID id, UUID accountId, FollowContext.Target target) {}
}
