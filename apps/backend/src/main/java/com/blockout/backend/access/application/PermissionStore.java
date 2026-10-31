package com.blockout.backend.access.application;

import com.blockout.backend.access.domain.Permission;
import java.util.Set;
import java.util.UUID;

/** Current-grant persistence and erasure; assignment remains owner-operated SQL. */
public interface PermissionStore {
  /**
   * Removes this original account's personal data in the caller's erasure transaction. Retained
   * nonpersonal facts and other owners remain unchanged; acquires no domain root.
   *
   * @param accountId original lifecycle protected by its account row lock
   */
  void erase(UUID accountId);

  /**
   * Reads the grants attached to this exact account lifecycle, without caching.
   *
   * @param accountId original business UUID
   * @return known grants, empty for an absent or unprivileged account
   */
  Set<Permission> findByAccountId(UUID accountId);
}
