package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

/** Native Spring Data access to the sporting match owner. */
interface MatchRepository extends JpaRepository<MatchEntity, UUID> {
  /**
   * Selects current qualified detail references.
   *
   * @param poolId eligible LNV pool
   * @param page bounded native detail page
   * @return current qualified detail references in identity order
   */
  @Query(
      "SELECT m FROM MatchEntity m JOIN FETCH m.pool p JOIN FETCH p.pack WHERE p.id = :poolId AND m.detailUrl IS NOT NULL ORDER BY m.id")
  List<MatchEntity> acquisitionDetails(UUID poolId, Pageable page);

  /**
   * Aggregates current reliable fast windows for a bounded pool selection.
   *
   * @param poolIds bounded selected pool identities
   * @param earliest earliest reliable start still in H+4
   * @param latest latest start already in H-1
   * @return one aggregate per currently fast pool, without per-pool queries
   */
  @Query(
      """
      SELECT m.pool.id AS poolId, MAX(m.reliableStart) AS latestStart
      FROM MatchEntity m
      WHERE m.pool.id IN :poolIds AND m.reliableStart BETWEEN :earliest AND :latest
      GROUP BY m.pool.id
      """)
  List<PoolMatchStart> findLatestMatchStartsInWindow(
      List<UUID> poolIds, Instant earliest, Instant latest);

  /**
   * Finds the match by contextual native reference.
   *
   * @param poolId contextual pool
   * @param reference native match code
   * @return established encounter
   */
  Optional<MatchEntity> findByPoolIdAndReference(UUID poolId, String reference);

  /**
   * Serializes schedule and future same-match transitions after the season/cycle locks.
   *
   * @param id established match
   * @return locked current match
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT m FROM MatchEntity m WHERE m.id = :id")
  Optional<MatchEntity> lockById(UUID id);
}
