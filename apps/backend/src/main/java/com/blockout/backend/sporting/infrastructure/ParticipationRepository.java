package com.blockout.backend.sporting.infrastructure;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Native Spring Data access to the sporting participation owner. */
interface ParticipationRepository extends JpaRepository<ParticipationEntity, UUID> {
  /**
   * Checks whether the retained team/pool relation already exists.
   *
   * @param teamId established team
   * @param poolId contextual pool
   * @return whether its retained participation exists
   */
  boolean existsByTeamIdAndPoolId(UUID teamId, UUID poolId);
}
