package com.blockout.backend.notifications.infrastructure;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
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
   * Deletes every original-owner row, including hidden entries, under its account lock.
   *
   * @param accountId locked original lifecycle
   */
  @Modifying
  @Query("DELETE FROM NotificationEntity e WHERE e.accountId = :accountId")
  void erase(UUID accountId);

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
   * Deletes all expired personal rows in the caller's single retention transaction. No managed
   * notification entities are loaded by this path, so no persistence-context clear is needed.
   *
   * @param cutoff inclusive original creation cutoff, fixed for this pass
   * @return rows actually deleted, allowing concurrent account cascades
   */
  @Modifying
  @Query("DELETE FROM NotificationEntity n WHERE n.createdAt <= :cutoff")
  int deleteExpired(Instant cutoff);

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
