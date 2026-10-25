package com.blockout.backend.following.application;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Replaces one original-account follow member atomically and idempotently. */
@Service
@RequiredArgsConstructor
public class ReplaceFollowState {
  private final CurrentFollowTarget target;
  private final FollowStore store;

  /**
   * Replaces state in a short local transaction; repeated true preserves the existing UUID. The
   * account lock excludes competing writers, and commit failures propagate before an API success.
   *
   * @param context already admitted original owner and exact target
   * @param following complete desired state; false removes only this relation
   * @return state established by this operation, ordered by server lock acquisition
   * @throws AccountNotFoundException when the original lifecycle has disappeared
   * @throws FollowUnavailableTargetException for an unknown or currently hidden target
   */
  @Transactional
  public boolean replace(FollowContext context, boolean following) {
    target.require(context);
    if (following) {
      if (store.find(context).isEmpty()) store.add(context);
    } else {
      store.remove(context);
    }
    return following;
  }
}
