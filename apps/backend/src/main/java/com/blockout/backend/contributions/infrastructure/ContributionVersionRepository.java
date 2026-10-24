package com.blockout.backend.contributions.infrastructure;

import com.blockout.backend.contributions.domain.ContributionQuota;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Native JPA quota aggregates over persisted creation facts, never a loaded history page. */
interface ContributionVersionRepository extends JpaRepository<ContributionVersionEntity, UUID> {
  /**
   * Counts lifetime ordinary submissions even after their lifecycle state changes.
   *
   * @param ownerId original account
   * @param matchId target match
   * @return immutable participating versions across all days
   */
  long countByOwnerIdAndMatchIdAndQuotaParticipatingTrue(UUID ownerId, UUID matchId);

  /**
   * Counts distinct matches inside the caller's half-open Paris calendar day.
   *
   * @param ownerId original account
   * @param start inclusive midnight
   * @param end exclusive next midnight
   * @return distinct participating matches regardless of current version state
   */
  @Query(
      "SELECT COUNT(DISTINCT v.matchId) FROM ContributionVersionEntity v WHERE v.ownerId = :ownerId AND v.quotaParticipating = TRUE AND v.createdAt >= :start AND v.createdAt < :end")
  long dailyMatches(UUID ownerId, Instant start, Instant end);

  /**
   * Detects whether a new version continues a match already charged today.
   *
   * @param ownerId original account
   * @param matchId target match
   * @param start inclusive midnight
   * @param end exclusive next midnight
   * @return whether a participating version exists in the day
   */
  @Query(
      "SELECT COUNT(v) > 0 FROM ContributionVersionEntity v WHERE v.ownerId = :ownerId AND v.matchId = :matchId AND v.quotaParticipating = TRUE AND v.createdAt >= :start AND v.createdAt < :end")
  boolean matchCountedToday(UUID ownerId, UUID matchId, Instant start, Instant end);

  /**
   * Reads one coherent aggregate; write protection still requires the command's account lock.
   *
   * @param ownerId usable original account
   * @param matchId target match
   * @param day successive Paris-midnight boundaries
   * @return detached ordinary usage without any update or quota refund
   */
  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  default ContributionQuota.Usage usage(UUID ownerId, UUID matchId, ContributionQuota.Day day) {
    return new ContributionQuota.Usage(
        countByOwnerIdAndMatchIdAndQuotaParticipatingTrue(ownerId, matchId),
        dailyMatches(ownerId, day.startsAt(), day.endsAt()),
        matchCountedToday(ownerId, matchId, day.startsAt(), day.endsAt()));
  }
}
