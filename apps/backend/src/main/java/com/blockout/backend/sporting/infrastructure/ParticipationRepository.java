package com.blockout.backend.sporting.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
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
  Optional<ParticipationEntity> findByTeamIdAndPoolId(UUID teamId, UUID poolId);

  /**
   * Loads the retained scope for qualified absence, never deleting its relationships.
   *
   * @param poolId completed calendar scope
   * @return all retained participants
   */
  List<ParticipationEntity> findByPoolId(UUID poolId);

  /**
   * Includes retained absent relationships because corrections must preserve their identity.
   *
   * @param teamIds affected stable teams
   * @return current and absent retained relationships
   */
  @EntityGraph(attributePaths = {"pool", "pool.division", "team"})
  List<ParticipationEntity> findByTeamIdIn(List<UUID> teamIds);
}
