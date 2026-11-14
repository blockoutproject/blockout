package com.blockout.backend.following.infrastructure;

import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/** Native JPA queries over only team relations, with no sporting presentation copies. */
interface TeamFollowRepository extends JpaRepository<TeamFollowEntity, UUID> {
  /**
   * Counts retained relations for the exact target, independently of current presentation.
   *
   * @param teamId original team identity already admitted by the application owner
   * @return number of persisted distinct owner/target relationships
   */
  long countByTeamId(UUID teamId);

  /**
   * Deletes every original-owner row, including hidden entries, under its account lock.
   *
   * @param accountId locked original lifecycle
   */
  @Modifying
  @Query("DELETE FROM TeamFollowEntity e WHERE e.accountId = :accountId")
  void erase(UUID accountId);

  /**
   * Checks one exact owner/target pair without resolving replacements.
   *
   * @param accountId original account
   * @param teamId exact target
   * @return whether the relation currently exists
   */
  boolean existsByAccountIdAndTeamId(UUID accountId, UUID teamId);

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
   * @return account union without loading relations, accounts or sporting resources
   */
  @Query(
      """
      SELECT t.accountId
      FROM TeamFollowEntity t WHERE t.teamId IN :teamIds
      UNION
      SELECT p.accountId
      FROM PoolFollowEntity p WHERE p.poolId IN :poolIds
      """)
  Set<UUID> findRecipientAccounts(Set<UUID> teamIds, Set<UUID> poolIds);
}
