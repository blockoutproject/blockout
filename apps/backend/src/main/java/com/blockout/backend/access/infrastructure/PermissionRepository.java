package com.blockout.backend.access.infrastructure;

import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

/** Native Spring Data read projection; grant management has no application write API. */
interface PermissionRepository extends Repository<PermissionEntity, PermissionEntity.Key> {
  /**
   * Reads scalar grants from the current statement snapshot, without retaining managed entities.
   *
   * @param accountId original business UUID; the foreign key excludes orphan grants
   * @return stored action identifiers, empty after erasure or without assignments
   */
  @Query("select p.permission from PermissionEntity p where p.accountId = :accountId")
  Set<String> findByAccountId(UUID accountId);
}
