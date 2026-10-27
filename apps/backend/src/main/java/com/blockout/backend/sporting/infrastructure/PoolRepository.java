package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.sporting.application.model.PoolKey;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Native Spring Data access to the sporting pool owner. */
interface PoolRepository extends JpaRepository<PoolEntity, UUID> {
  /**
   * Aggregates missing effective settings independently of historical published classification.
   *
   * @param seasonId canonical catalog season
   * @param provider designated authority
   * @return current catalog pool count, excluding local overrides and inherited settings
   */
  @Query(
      """
      SELECT COUNT(p) FROM PoolEntity p JOIN p.pack pack
      WHERE p.season.id = :seasonId AND p.provider = :provider AND p.catalogEligible = TRUE
        AND p.setting.settingDivisionId IS NULL AND pack.setting.settingDivisionId IS NULL
      """)
  long countUnclassified(UUID seasonId, CollectionProviderEnum provider);

  /**
   * Pages direct children of an already scope-checked pack without filtering unmapped pools.
   *
   * @param packId pack in the selected source
   * @param pageable bounded direct-child request
   * @return stable source-name/identity slice
   */
  Slice<PoolEntity> findByPackIdOrderBySourceNameAscIdAsc(UUID packId, Pageable pageable);

  /**
   * Selects qualified pools after the visited identity boundary despite concurrent division
   * changes.
   *
   * @param seasonId locked canonical season
   * @param provider binding provider
   * @param initialImport permits qualified historical references absent from the current catalog
   * @param organizerReference binding root
   * @param afterId exclusive last visited identity, or null to start
   * @param page first page limiting the next batch
   * @return only current catalog pools with complete, active effective acquisition classification
   */
  @Query(
      """
      SELECT p FROM PoolEntity p JOIN FETCH p.pack pack
      JOIN DivisionEntity d ON d.id = COALESCE(p.setting.settingDivisionId, pack.setting.settingDivisionId)
      WHERE p.season.id = :seasonId AND p.provider = :provider AND p.organizerReference = :organizerReference
      AND (:afterId IS NULL OR p.id > :afterId)
      AND (:initialImport = TRUE OR p.catalogEligible = TRUE) AND d.active = TRUE
      AND (p.calendarUrl IS NOT NULL OR p.standingsUrl IS NOT NULL)
      ORDER BY p.id
      """)
  List<PoolEntity> acquisitionPools(
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizerReference,
      boolean initialImport,
      UUID afterId,
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

  /** Canonical current pool eligibility for queries using the pool alias p. */
  String VISIBLE =
      "p.catalogEligible = TRUE AND p.calendarEmpty = FALSE AND p.division.active = TRUE";

  /**
   * Reads visibility facts without hydrating presentation or acquisition state.
   *
   * @param id exact pool identity
   * @return current restrictions, or empty when unknown
   */
  @Query(
      """
      SELECT NEW com.blockout.backend.sporting.infrastructure.PoolVisibilityRow(
        p.catalogEligible, p.calendarEmpty, d.id, d.active)
      FROM PoolEntity p LEFT JOIN p.division d WHERE p.id = :id
      """)
  Optional<PoolVisibilityRow> findVisibility(UUID id);

  /**
   * Selects canonical seasons from currently visible pools without loading their cards.
   *
   * @return distinct seasons in descending start-year and ascending UUID order
   */
  @Query(
      "SELECT DISTINCT s FROM PoolEntity p JOIN p.season s WHERE "
          + VISIBLE
          + " ORDER BY s.startYear DESC, s.id")
  List<SeasonEntity> findVisibleSeasons();

  /**
   * Selects visible search roots before bounded hydration.
   *
   * @param page bounded projection request
   * @return eligible identities in stable order
   */
  @Query("SELECT p.id FROM PoolEntity p WHERE " + VISIBLE + " ORDER BY p.id")
  List<UUID> findProjectionIds(Pageable page);

  /**
   * Projects public search facts without image payloads or lazy collection reads.
   *
   * @param ids bounded candidate identities
   * @return currently visible inputs in identity order
   */
  @Query(
      """
      SELECT NEW com.blockout.backend.sporting.infrastructure.SportingSearchRow(
        p.id, p.season.id, p.sourceName, COALESCE(p.manualName, p.sourceName), COALESCE(p.manualShortName, p.sourceName), p.division.id, p.division.name, p.format, p.gender,
        NULL, NULL, NULL)
      FROM PoolEntity p WHERE p.id IN :ids AND
      """
          + VISIBLE
          + " ORDER BY p.id")
  List<SportingSearchRow> findSearchInputs(Set<UUID> ids);

  /**
   * Reads qualified aliases for selected pools.
   *
   * @param ids bounded pool identities
   * @return owner-keyed alias facts
   */
  @Query(
      """
      SELECT NEW com.blockout.backend.sporting.infrastructure.SportingAliasRow(
        p.id, a.seasonId, a.organizerReference, a.competitionReference, a.comparisonName)
      FROM PoolEntity p JOIN p.aliases a WHERE p.id IN :ids
      """)
  List<SportingAliasRow> findAliases(Set<UUID> ids);

  /**
   * Finds affected owners including hidden resources requiring index removal.
   *
   * @param divisions changed divisions, possibly empty
   * @param seasons changed seasons, possibly empty
   * @return dependent pool identities
   */
  @Query(
      "SELECT p.id FROM PoolEntity p WHERE p.division.id IN :divisions OR p.season.id IN :seasons")
  List<UUID> findProjectionDependents(Set<UUID> divisions, Set<UUID> seasons);
}
