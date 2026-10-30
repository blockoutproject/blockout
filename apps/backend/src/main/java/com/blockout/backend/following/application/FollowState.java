package com.blockout.backend.following.application;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Reads one original-account member and serializes desired-state writes under the account lock. */
@Service
@RequiredArgsConstructor
public class FollowState {
  private final AccountAccess accounts;
  private final ReadSportingData sporting;
  private final FollowStore store;

  /**
   * Reads member state from one ordinary snapshot without taking the account write lock. A
   * concurrent write or erasure may complete after this snapshot began.
   *
   * @param context already admitted original owner and exact target
   * @return persisted relation existence; absence needs no row
   * @throws AccountNotFoundException when the original lifecycle has disappeared
   * @throws FollowUnavailableTargetException for an unknown or currently hidden target
   */
  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public boolean read(FollowContext context) {
    if (!accounts.exists(context.accountId())) throw new AccountNotFoundException();
    requireVisibleTarget(context);
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
    if (!accounts.lock(context.accountId())) throw new AccountNotFoundException();
    requireVisibleTarget(context);
    if (following) {
      if (store.find(context).isEmpty()) store.add(context);
    } else {
      store.remove(context);
    }
    return following;
  }

  /**
   * Reads the target's current F02 visibility inside the caller's transaction without sporting
   * locks.
   *
   * @param context exact original account and sporting identity
   * @throws FollowUnavailableTargetException when the exact target is unknown or hidden
   */
  private void requireVisibleTarget(FollowContext context) {
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
