package com.blockout.backend.access.infrastructure;

import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

/** Native Spring Data read projection; grant management has no application write API. */
interface PermissionRepository extends Repository<PermissionEntity, PermissionEntity.Key> {
  /**
   * Deletes every original-owner row, including hidden entries, under its account lock.
   *
   * @param accountId locked original lifecycle
   */
  @Modifying
  @Query("DELETE FROM PermissionEntity e WHERE e.accountId = :accountId")
  void erase(UUID accountId);

  /**
   * Reads scalar grants from the current statement snapshot, without retaining managed entities.
   *
   * @param accountId original business UUID; the foreign key excludes orphan grants
   * @return stored action identifiers, empty after erasure or without assignments
   */
  @Query("SELECT p.permission FROM PermissionEntity p WHERE p.accountId = :accountId")
  Set<String> findByAccountId(UUID accountId);
}
