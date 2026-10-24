package com.blockout.backend.following.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Native JPA queries over only pool relations, with no sporting presentation copies. */
interface PoolFollowRepository extends JpaRepository<PoolFollowEntity, UUID> {
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
