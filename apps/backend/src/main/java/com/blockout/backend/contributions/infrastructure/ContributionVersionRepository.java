package com.blockout.backend.contributions.infrastructure;

import com.blockout.backend.contributions.domain.ContributionQuota;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Native Hibernate quota aggregate over persisted creation facts, never a loaded history page. */
interface ContributionVersionRepository extends JpaRepository<ContributionVersionEntity, UUID> {
  /**
   * Reads a native Slice without a count query or cross-page snapshot promise.
   *
   * @param matchId current encounter
   * @param ownerId original owner
   * @param page bounded twenty-item page
   * @return creation-descending, UUID-ascending personal history
   */
  org.springframework.data.domain.Slice<ContributionVersionEntity>
      findByMatchIdAndOwnerIdOrderByCreatedAtDescIdAsc(
          UUID matchId, UUID ownerId, org.springframework.data.domain.Pageable page);

  /**
   * Reads all usage from one SQL statement snapshot, independent of lifecycle state or later
   * grants. Hibernate's filtered aggregates avoid separate queries and an extra isolation boundary.
   *
   * @param ownerId original account
   * @param matchId target match for lifetime usage and same-day continuation
   * @param start inclusive Paris midnight
   * @param end exclusive next Paris midnight
   * @return lifetime versions, distinct daily matches and target participation today; zero when
   *     absent
   */
  @Query(
      """
      SELECT NEW com.blockout.backend.contributions.domain.ContributionQuota$Usage(
        COUNT(v) FILTER (WHERE v.matchId = :matchId),
        COUNT(DISTINCT v.matchId) FILTER (WHERE v.createdAt >= :start AND v.createdAt < :end),
        COUNT(v) FILTER (WHERE v.matchId = :matchId AND v.createdAt >= :start AND v.createdAt < :end) > 0)
      FROM ContributionVersionEntity v
      WHERE v.ownerId = :ownerId AND v.quotaParticipating = TRUE
      """)
  ContributionQuota.Usage usage(UUID ownerId, UUID matchId, Instant start, Instant end);

  /**
   * Reads one coherent aggregate; write protection still requires the command's account lock.
   *
   * @param ownerId usable original account
   * @param matchId target match
   * @param day successive Paris-midnight boundaries
   * @return detached ordinary usage without any update or quota refund
   */
  default ContributionQuota.Usage usage(UUID ownerId, UUID matchId, ContributionQuota.Day day) {
    return usage(ownerId, matchId, day.startsAt(), day.endsAt());
  }
}
