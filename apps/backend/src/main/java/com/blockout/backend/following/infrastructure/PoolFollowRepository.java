package com.blockout.backend.following.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/** Native JPA queries over only pool relations, with no sporting presentation copies. */
interface PoolFollowRepository extends JpaRepository<PoolFollowEntity, UUID> {
  /**
   * Counts retained relations for the exact target, independently of current presentation.
   *
   * @param poolId original pool identity already admitted by the application owner
   * @return number of persisted distinct owner/target relationships
   */
  long countByPoolId(UUID poolId);

  /**
   * Deletes every original-owner row, including hidden entries, under its account lock.
   *
   * @param accountId locked original lifecycle
   */
  @Modifying
  @Query("DELETE FROM PoolFollowEntity e WHERE e.accountId = :accountId")
  void erase(UUID accountId);

  /**
   * Reads one exact owner/target pair without resolving replacements.
   *
   * @param accountId original account
   * @param poolId exact target
   * @return currently persisted relation
   */
  Optional<PoolFollowEntity> findByAccountIdAndPoolId(UUID accountId, UUID poolId);

  /**
   * Deletes only this pair; the caller holds the original account lock.
   *
   * @param accountId locked original account
   * @param poolId exact target
   */
  void deleteByAccountIdAndPoolId(UUID accountId, UUID poolId);
}
