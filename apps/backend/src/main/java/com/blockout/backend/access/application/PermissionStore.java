package com.blockout.backend.access.application;

import com.blockout.backend.access.domain.Permission;
import java.util.Set;
import java.util.UUID;

/** Read-only persistence boundary for current grants; assignment remains owner-operated SQL. */
public interface PermissionStore {
  /**
   * Reads the grants attached to this exact account lifecycle, without caching.
   *
   * @param accountId original business UUID
   * @return known grants, empty for an absent or unprivileged account
   */
  Set<Permission> findByAccountId(UUID accountId);
}
