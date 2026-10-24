package com.blockout.backend.following.application;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.SportingReadService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Original-account member state and idempotent replacement, serialized by the F05 account lock. */
@Service
@RequiredArgsConstructor
public class FollowService {
  private final AccountAccess accounts;
  private final SportingReadService sporting;
  private final FollowStore store;

  /**
   * Reads confirmed state under the same original-account lock used by writers.
   *
   * @param context already admitted original owner and exact target
   * @return persisted relation existence; absence needs no row
   * @throws AccountNotFoundException when the original lifecycle has disappeared
   * @throws FollowUnavailableTargetException for an unknown or currently hidden target
   */
  @Transactional
  public boolean state(FollowContext context) {
    requireCurrent(context);
    return store.find(context).isPresent();
  }

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
    requireCurrent(context);
    if (following) {
      if (store.find(context).isEmpty()) store.add(context);
    } else {
      store.remove(context);
    }
    return following;
  }

  /**
   * Locks only the original account, then reads F02's current decision without sporting locks. A
   * caller holding sporting roots must have taken them in owner order before entering here. No
   * provider call, identity replacement or later sporting-root lock occurs in this transaction.
   *
   * @param context exact original account and sporting identity
   */
  private void requireCurrent(FollowContext context) {
    if (!accounts.lock(context.accountId())) throw new AccountNotFoundException();
    Kind kind =
        switch (context.target().type()) {
          case TEAM -> Kind.TEAM;
          case POOL -> Kind.POOL;
        };
    sporting
        .visibility(kind, context.target().id())
        .filter(SportingVisibility::viewable)
        .orElseThrow(FollowUnavailableTargetException::new);
  }
}
