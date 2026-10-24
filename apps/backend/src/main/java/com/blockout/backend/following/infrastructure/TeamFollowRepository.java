package com.blockout.backend.following.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Native JPA queries over only team relations, with no sporting presentation copies. */
interface TeamFollowRepository extends JpaRepository<TeamFollowEntity, UUID> {
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
   * Reads only current relations for the consumer's sporting origins, using the target index.
   *
   * @param ids nonempty exact target identities
   * @return matching persisted rows, without a display-season filter
   */
  List<TeamFollowEntity> findByTeamIdIn(Set<UUID> ids);
}
