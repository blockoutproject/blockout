package com.blockout.backend.following.infrastructure;

import com.blockout.backend.following.application.FollowContext.Relation;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/** Native JPA queries over only team relations, with no sporting presentation copies. */
interface TeamFollowRepository extends JpaRepository<TeamFollowEntity, UUID> {
  /**
   * Deletes every original-owner row, including hidden entries, under its account lock.
   *
   * @param accountId locked original lifecycle
   */
  @Modifying
  @Query("DELETE FROM TeamFollowEntity e WHERE e.accountId = :accountId")
  void erase(UUID accountId);

  /**
   * Reads one exact owner/target pair without resolving replacements.
   *
   * @param accountId original account
   * @param teamId exact target
   * @return currently persisted relation
   */
  Optional<TeamFollowEntity> findByAccountIdAndTeamId(UUID accountId, UUID teamId);

  /**
   * Deletes only this pair; the caller holds the original account lock.
   *
   * @param accountId locked original account
   * @param teamId exact target
   */
  void deleteByAccountIdAndTeamId(UUID accountId, UUID teamId);

  /**
   * Projects both supported follow origins from one statement snapshot. Separate origin reads could
   * manufacture an empty audience during a committed team/pool turnover.
   *
   * @param teamIds exact selected team origins, possibly empty
   * @param poolIds exact selected pool origins, possibly empty
   * @return original relation identities without loading accounts or sporting resources
   */
  @Query(
      """
      SELECT NEW com.blockout.backend.following.application.FollowContext$Relation(
        t.id, t.accountId, NEW com.blockout.backend.following.application.FollowContext$Target(
          com.blockout.backend.following.application.FollowContext$TargetType.TEAM, t.teamId))
      FROM TeamFollowEntity t WHERE t.teamId IN :teamIds
      UNION ALL
      SELECT NEW com.blockout.backend.following.application.FollowContext$Relation(
        p.id, p.accountId, NEW com.blockout.backend.following.application.FollowContext$Target(
          com.blockout.backend.following.application.FollowContext$TargetType.POOL, p.poolId))
      FROM PoolFollowEntity p WHERE p.poolId IN :poolIds
      """)
  List<Relation> findRelations(Set<UUID> teamIds, Set<UUID> poolIds);
}
