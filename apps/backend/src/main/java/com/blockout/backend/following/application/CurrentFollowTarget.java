package com.blockout.backend.following.application;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Shared original-account serialization and current target admission for follow member operations.
 */
@Component
@RequiredArgsConstructor
public class CurrentFollowTarget {
  private final AccountAccess accounts;
  private final ReadSportingData sporting;

  /**
   * Locks only the original account, then reads F02's current decision without sporting locks. A
   * caller holding sporting roots must have taken them in owner order before entering here. No
   * provider call, identity replacement or later sporting-root lock occurs in this transaction.
   *
   * @param context exact original account and sporting identity
   * @throws AccountNotFoundException when the original lifecycle no longer exists
   * @throws FollowUnavailableTargetException when the exact target is unknown or hidden
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public void require(FollowContext context) {
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
