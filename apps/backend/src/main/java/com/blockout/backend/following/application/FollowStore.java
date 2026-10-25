package com.blockout.backend.following.application;

import com.blockout.backend.following.application.FollowContext.Relation;
import java.util.List;
import java.util.Optional;
import java.util.Set;

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
   * Reads confirmed relations for the supplied sporting origins from one statement snapshot,
   * without display-season filtering. Split origin reads must not invent an empty audience during a
   * committed team/pool turnover.
   *
   * @param targets the actual consumer's team/pool origins, possibly empty
   * @return detached identities of currently present relations
   */
  List<Relation> relations(Set<FollowContext.Target> targets);
}
