package com.blockout.backend.access.application;

import com.blockout.backend.access.domain.Permission;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Current privilege projection, independent of JWT roles, entitlements and resource eligibility.
 */
@Service
@RequiredArgsConstructor
public class CurrentPermissions {
  private final PermissionStore permissions;

  /**
   * Reads current grants for presentation; a returned projection never authorizes a later write.
   *
   * @param accountId original business UUID
   * @return immutable current grants, empty after erasure or without assignments
   */
  @Transactional(readOnly = true)
  public Set<Permission> forAccount(UUID accountId) {
    return Set.copyOf(permissions.findByAccountId(accountId));
  }

  /**
   * Requires a current grant before exposing protected content, without retaining an account lock.
   * Mutations use {@link ActionAuthorization#require(UUID, Permission)} instead so withdrawal is
   * ordered with their commit. This read cannot authorize a later effect.
   *
   * @param accountId original business UUID; absent accounts have no grants
   * @param permission exact grant protecting the requested read
   * @throws AccessDeniedException when the current account lacks this grant
   */
  @Transactional(readOnly = true)
  public void requireForRead(UUID accountId, Permission permission) {
    if (!forAccount(accountId).contains(permission)) {
      throw new AccessDeniedException("Action is not permitted");
    }
  }
}
