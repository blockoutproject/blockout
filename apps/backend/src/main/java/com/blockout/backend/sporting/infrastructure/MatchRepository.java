package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

/** Native Spring Data access to the sporting match owner. */
interface MatchRepository extends JpaRepository<MatchEntity, UUID> {
  /**
   * Loads retained encounters for a qualified completed calendar.
   *
   * @param poolId still-current calendar scope
   * @return retained encounters without result-dependent filtering
   */
  List<MatchEntity> findByPoolId(UUID poolId);

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
   * Projects the immutable parent without attaching the match to the persistence context.
   *
   * @param id existing match identity
   * @return owning pool identity, or empty when the match is absent
   */
  @Query("SELECT m.pool.id FROM MatchEntity m WHERE m.id = :id")
  Optional<UUID> findPoolId(UUID id);

  /**
   * Serializes schedule and future same-match transitions after the season/cycle locks.
   *
   * @param id established match
   * @return locked current match
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT m FROM MatchEntity m WHERE m.id = :id")
  Optional<MatchEntity> findByIdForUpdate(UUID id);

  /**
   * Projects current visibility without loading result, document or image state.
   *
   * @param id exact match identity
   * @return scalar current restrictions, or empty for an unknown match
   */
  @Query(
      """
      SELECT NEW com.blockout.backend.sporting.infrastructure.MatchVisibilityRow(
        p.id, p.catalogEligible, p.calendarEmpty, d.id, d.active,
        m.present, m.localDate, m.homeTeam.id, m.awayTeam.id)
      FROM MatchEntity m JOIN m.pool p LEFT JOIN p.division d WHERE m.id = :id
      """)
  Optional<MatchVisibilityRow> findVisibility(UUID id);

  /**
   * Hydrates admitted match facts with their pool season and classification. Participant identities
   * remain lazy references; public names and artwork presence use the scalar presentation reads.
   *
   * @param ids already selected match identities
   * @return managed matches without multiplying roots through collection fetches
   */
  @Query(
      """
      SELECT m FROM MatchEntity m
      JOIN FETCH m.pool p JOIN FETCH p.season JOIN FETCH p.division
      WHERE m.id IN :ids
      """)
  List<MatchEntity> findPresentationByIdIn(Set<UUID> ids);
}
