package com.blockout.backend.contributions.infrastructure;

import com.blockout.backend.contributions.domain.ContributionQuota;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Current versions, native history slices and quota aggregates over persisted creation facts. */
interface ContributionVersionRepository extends JpaRepository<ContributionVersionEntity, UUID> {
  /**
   * Selects active public-link identities for an already admitted bounded match selection.
   *
   * @param matchIds current sporting identities
   * @param state active lifecycle selected by the store
   * @return matching identities without loading contribution bodies
   */
  @Query(
      "SELECT v.matchId FROM ContributionVersionEntity v WHERE v.matchId IN :matchIds AND v.state = :state")
  List<UUID> findMatchIdsByMatchIdInAndState(Collection<UUID> matchIds, State state);

  /**
   * Selects every attribution needed before acquiring account locks in UUID order.
   *
   * @param matchId encounter protected by its sporting locks
   * @param states current version lifecycles
   * @return nullable original attribution identities without entity hydration
   */
  @Query(
      "SELECT v.ownerId AS ownerId, v.publicationActorId AS publicationActorId, v.decisionActorId AS decisionActorId FROM ContributionVersionEntity v WHERE v.matchId = :matchId AND v.state IN :states")
  List<Attribution> findAttributions(UUID matchId, Collection<State> states);

  /**
   * Reads a bounded deterministic maintenance batch, exclusive of the last processed match.
   *
   * @param state active lifecycle selected by the store
   * @param afterId exclusive match UUID, or null for the first batch
   * @param limit maximum batch size
   * @return ordered match identities; active uniqueness guarantees no duplicates
   */
  @Query(
      "SELECT v.matchId FROM ContributionVersionEntity v WHERE v.state = :state AND (:afterId IS NULL OR v.matchId > :afterId) ORDER BY v.matchId")
  List<UUID> findMatchIdsAfter(State state, UUID afterId, Limit limit);

  /** Scalar attribution projection; null means absent attribution or an erased original account. */
  interface Attribution {
    UUID getOwnerId();

    UUID getPublicationActorId();

    UUID getDecisionActorId();
  }

  /**
   * Reads the single version in a match state protected by native conditional uniqueness.
   *
   * @param matchId current encounter
   * @param state uniquely constrained state, currently active
   * @return current version, or empty when absent
   */
  Optional<ContributionVersionEntity> findByMatchIdAndState(UUID matchId, State state);

  /**
   * Reads one owner's unique active or pending version without exposing another owner's history.
   *
   * @param matchId current encounter
   * @param ownerId original submitting account
   * @param state active or pending state protected by native conditional uniqueness
   * @return current owner-scoped version, or empty when absent
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
   * Counts every matching owner's version without a lifecycle, page or quota filter.
   *
   * @param matchId current encounter
   * @param ownerId original owner whose retained versions may be exposed
   * @return exact matching count from the caller's current database snapshot
   */
  long countByMatchIdAndOwnerId(UUID matchId, UUID ownerId);

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
}
