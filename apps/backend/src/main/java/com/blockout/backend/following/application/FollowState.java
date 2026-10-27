package com.blockout.backend.following.application;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reads and replaces one original-account follow member under the same account lock. */
@Service
@RequiredArgsConstructor
public class FollowState {
  private final AccountAccess accounts;
  private final ReadSportingData sporting;
  private final FollowStore store;

  /**
   * Reads confirmed state under the original-account lock used by writers. This read deliberately
   * uses a write-capable transaction because PostgreSQL must acquire that row lock.
   *
   * @param context already admitted original owner and exact target
   * @return persisted relation existence; absence needs no row
   * @throws AccountNotFoundException when the original lifecycle has disappeared
   * @throws FollowUnavailableTargetException for an unknown or currently hidden target
   */
  @Transactional
  public boolean read(FollowContext context) {
    requireTarget(context);
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
    requireTarget(context);
    if (following) {
      if (store.find(context).isEmpty()) store.add(context);
    } else {
      store.remove(context);
    }
    return following;
  }

  /**
   * Locks only the original account in the public operation's transaction, then reads F02's current
   * decision without sporting locks. A caller holding sporting roots must have acquired them in
   * owner order first; no provider work, replacement identity or later sporting-root lock occurs.
   *
   * @param context exact original account and sporting identity
   * @throws AccountNotFoundException when the original lifecycle no longer exists
   * @throws FollowUnavailableTargetException when the exact target is unknown or hidden
   */
  private void requireTarget(FollowContext context) {
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
