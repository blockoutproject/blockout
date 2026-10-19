package com.blockout.backend.access.application;

import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountAccess;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Checks one current action grant within the owning business mutation's transaction. */
@Service
@RequiredArgsConstructor
public class ActionAuthorization {
  private final AccountAccess accounts;
  private final CurrentPermissions permissions;

  /**
   * Locks the original account before reading its grant and holds the lock through caller commit.
   * Acquire domain roots first, then accounts in UUID order; acquire no domain root afterward. The
   * caller still checks current resource ownership, visibility, age and quota rules before effects.
   *
   * @param accountId original business UUID resolved from the validated principal
   * @param permission exact action being requested
   * @throws AccessDeniedException if the account no longer exists or lacks this grant
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public void require(UUID accountId, Permission permission) {
    if (!accounts.lock(accountId) || !permissions.forAccount(accountId).contains(permission)) {
      throw new AccessDeniedException("Action is not permitted");
    }
  }
}
