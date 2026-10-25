package com.blockout.backend.sporting.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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

  /**
   * Resolves retained memberships for acquisition scope checks without hydrating sporting state.
   *
   * @param teamId stable sporting team
   * @return current and absent retained pool identities
   */
  @Query("SELECT p.pool.id FROM ParticipationEntity p WHERE p.team.id = :teamId")
  List<UUID> findPoolIdsByTeamId(UUID teamId);

  /**
   * Selects teams whose current participation and classification permit pool consultation.
   *
   * @param poolId exact pool identity
   * @return currently viewable team identities
   */
  @Query(
      "SELECT t.id FROM ParticipationEntity r JOIN r.pool p JOIN r.team t WHERE p.id = :poolId AND r.current = TRUE AND t.division.active = TRUE AND "
          + PoolRepository.VISIBLE)
  List<UUID> findVisibleTeamIds(UUID poolId);

  /**
   * Batch-resolves current visible memberships without copying visibility state.
   *
   * @param ids bounded team identities
   * @return eligible team/pool pairs in stable pool order
   */
  @Query(
      "SELECT NEW com.blockout.backend.sporting.infrastructure.TeamPoolRow(r.team.id, p.id) FROM ParticipationEntity r JOIN r.pool p WHERE r.team.id IN :ids AND r.current = TRUE AND r.team.division.active = TRUE AND "
          + PoolRepository.VISIBLE
          + " ORDER BY p.id")
  List<TeamPoolRow> findVisibleMemberships(Set<UUID> ids);

  /**
   * Resolves retained teams affected by pool changes, including absent participation.
   *
   * @param pools changed pool identities
   * @return distinct retained team identities
   */
  @Query("SELECT DISTINCT r.team.id FROM ParticipationEntity r WHERE r.pool.id IN :pools")
  List<UUID> findTeamIdsByPoolIds(Set<UUID> pools);

  /**
   * Resolves retained pools affected by team changes, including absent participation.
   *
   * @param teams changed team identities
   * @return distinct retained pool identities
   */
  @Query("SELECT DISTINCT r.pool.id FROM ParticipationEntity r WHERE r.team.id IN :teams")
  List<UUID> findPoolIdsByTeamIds(Set<UUID> teams);
}
