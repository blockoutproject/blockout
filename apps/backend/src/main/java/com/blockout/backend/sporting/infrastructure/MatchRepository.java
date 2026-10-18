package com.blockout.backend.sporting.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Native Spring Data access to the sporting match owner. */
interface MatchRepository extends JpaRepository<MatchEntity, UUID> {
  /**
   * Finds the match by contextual native reference.
   *
   * @param poolId contextual pool
   * @param reference native match code
   * @return established encounter
   */
  Optional<MatchEntity> findByPoolIdAndReference(UUID poolId, String reference);
}
