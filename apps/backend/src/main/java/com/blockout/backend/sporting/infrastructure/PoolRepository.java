package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.sporting.application.model.PoolKey;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Native Spring Data access to the sporting pool owner. */
interface PoolRepository extends JpaRepository<PoolEntity, UUID> {
  /**
   * Pages direct children of an already scope-checked pack without filtering unmapped pools.
   *
   * @param packId pack in the selected source
   * @param pageable bounded direct-child request
   * @return stable source-name/identity slice
   */
  Slice<PoolEntity> findByPackIdOrderBySourceNameAscIdAsc(UUID packId, Pageable pageable);

  /**
   * Selects qualified pools with complete active acquisition settings.
   *
   * @param seasonId locked canonical season
   * @param provider binding provider
   * @param initialImport permits qualified historical references absent from the current catalog
   * @param organizerReference binding root
   * @param page bounded database page
   * @return only current catalog pools with complete, active effective acquisition classification
   */
  @Query(
      """
      SELECT p FROM PoolEntity p JOIN FETCH p.pack pack
      JOIN DivisionEntity d ON d.id = COALESCE(p.setting.settingDivisionId, pack.setting.settingDivisionId)
      WHERE p.season.id = :seasonId AND p.provider = :provider AND p.organizerReference = :organizerReference
      AND (:initialImport = TRUE OR p.catalogEligible = TRUE) AND d.active = TRUE
      AND (p.calendarUrl IS NOT NULL OR p.standingsUrl IS NOT NULL)
      ORDER BY p.id
      """)
  List<PoolEntity> acquisitionPools(
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizerReference,
      boolean initialImport,
      Pageable page);

  /**
   * Resolves the immutable season reference without loading a pool into the persistence context.
   *
   * @param id existing pool identity
   * @return canonical season to lock before reading current sporting state
   */
  @Query("SELECT p.season.id FROM PoolEntity p WHERE p.id = :id")
  Optional<UUID> findSeasonId(UUID id);

  /**
   * Finds the full native key while preserving absent optional context.
   *
   * @param key complete contextual native key
   * @return matching pool, including absent tour/group
   */
  @Query(
      """
      SELECT p FROM PoolEntity p WHERE p.provider = :#{#key.provider} AND p.season.id = :#{#key.seasonId}
      AND p.organizerReference = :#{#key.organizerReference} AND p.competitionReference = :#{#key.competitionReference}
      AND p.reference = :#{#key.reference}
      AND p.tourReference IS NOT DISTINCT FROM :#{#key.tourReference}
      AND p.groupReference IS NOT DISTINCT FROM :#{#key.groupReference}
      """)
  Optional<PoolEntity> findByKey(PoolKey key);

  /**
   * Returns all scopes affected by a pack correction.
   *
   * @param packId native grouping
   * @return its current pools, including overrides
   */
  List<PoolEntity> findByPackId(UUID packId);

  /**
   * Loads only the catalog's source-season scope for qualified absence reconciliation.
   *
   * @param seasonId canonical season
   * @param provider designated authority
   * @param organizerReference exact source organizer
   * @return retained pools in that source-season scope
   */
  List<PoolEntity> findBySeasonIdAndProviderAndOrganizerReference(
      UUID seasonId, CollectionProviderEnum provider, String organizerReference);
}
