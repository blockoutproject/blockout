package com.blockout.backend.contributions.infrastructure;

import com.blockout.backend.contributions.domain.ContributionQuota;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Current versions, native history slices and quota aggregates over persisted creation facts. */
interface ContributionVersionRepository extends JpaRepository<ContributionVersionEntity, UUID> {
  /**
   * Reads the single version in a match state protected by native conditional uniqueness.
   *
   * @param matchId current encounter
   * @param state uniquely constrained state, currently active
   * @return current version, or empty when absent
   */
  Optional<ContributionVersionEntity> findByMatchIdAndState(UUID matchId, State state);

  /**
   * Reads one owner's unique current proposal without exposing another owner's history.
   *
   * @param matchId current encounter
   * @param ownerId original submitting account
   * @param state uniquely constrained owner state, currently pending
   * @return current proposal, or empty when absent
   */
  Optional<ContributionVersionEntity> findByMatchIdAndOwnerIdAndState(
      UUID matchId, UUID ownerId, State state);

  /**
   * Loads managed versions participating in an accepted replacement under the caller's locks.
   *
   * @param matchId locked encounter
   * @param states current lifecycle states to supersede or replace
   * @return versions whose lifecycle can change in this transaction
   */
  List<ContributionVersionEntity> findByMatchIdAndStateIn(UUID matchId, Collection<State> states);

  /**
   * Reads a native Slice without a count query or cross-page snapshot promise.
   *
   * @param matchId current encounter
   * @param ownerId original owner
   * @param page bounded twenty-item page
   * @return creation-descending, UUID-ascending personal history
   */
  Slice<ContributionVersionEntity> findByMatchIdAndOwnerIdOrderByCreatedAtDescIdAsc(
      UUID matchId, UUID ownerId, Pageable page);

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
