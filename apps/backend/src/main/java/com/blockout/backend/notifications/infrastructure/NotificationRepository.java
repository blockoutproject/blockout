package com.blockout.backend.notifications.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/**
 * Native specification/fluent keyset access to personal allocations, never string-query scrolling.
 */
interface NotificationRepository
    extends JpaRepository<NotificationEntity, UUID>, JpaSpecificationExecutor<NotificationEntity> {
  /**
   * Selects an owner's original sporting lock target without hydrating a personal entity.
   *
   * @param accountId captured original account
   * @param id personal allocation identity
   * @return match identity, or empty for an absent or foreign allocation
   */
  @Query("SELECT n.matchId FROM NotificationEntity n WHERE n.id = :id AND n.accountId = :accountId")
  Optional<UUID> findMatchId(UUID accountId, UUID id);

  /**
   * Selects a bounded oldest-first purge batch at the fixed retention cutoff.
   *
   * @param cutoff inclusive expiration instant
   * @param limit maximum number of identities
   * @return deterministic selected identities without loading personal presentation
   */
  @Query(
      "SELECT n.id FROM NotificationEntity n WHERE n.createdAt <= :cutoff ORDER BY n.createdAt, n.id")
  List<UUID> findExpiredIds(Instant cutoff, Limit limit);

  /**
   * Deletes only the selected expired rows inside the independently committed purge batch. No
   * notification entities are loaded in this transaction, so no managed state needs clearing.
   *
   * @param ids bounded selection from this batch
   * @param cutoff same inclusive expiration instant as selection
   * @return rows actually deleted, allowing concurrent account cascades
   */
  @Modifying
  @Query("DELETE FROM NotificationEntity n WHERE n.id IN :ids AND n.createdAt <= :cutoff")
  int deleteExpired(List<UUID> ids, Instant cutoff);

  /**
   * Advances only the read bit after the caller locks sporting roots and the original account.
   * Reads use scalar projections, so this bulk update leaves no stale managed allocation behind.
   *
   * @param accountId locked original account
   * @param id exact personal allocation
   * @param cutoff exclusive retention boundary
   * @return one for a retained owner allocation, zero if concurrently removed or expired
   */
  @Modifying
  @Query(
      "UPDATE NotificationEntity n SET n.read = TRUE WHERE n.id = :id AND n.accountId = :accountId AND n.createdAt > :cutoff")
  int markRead(UUID accountId, UUID id, Instant cutoff);
}
