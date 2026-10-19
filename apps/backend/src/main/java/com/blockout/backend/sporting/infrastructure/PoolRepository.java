package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.sporting.application.model.PoolKey;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Native Spring Data access to the sporting pool owner. */
interface PoolRepository extends JpaRepository<PoolEntity, UUID> {
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
      select p from PoolEntity p join fetch p.pack pack
      join DivisionEntity d on d.id = coalesce(p.setting.settingDivisionId, pack.setting.settingDivisionId)
      where p.season.id = :seasonId and p.provider = :provider and p.organizerReference = :organizerReference
      and (:initialImport = true or p.catalogEligible = true) and d.active = true
      and (p.calendarUrl is not null or p.standingsUrl is not null)
      order by p.id
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
  @Query("select p.season.id from PoolEntity p where p.id = :id")
  Optional<UUID> findSeasonId(UUID id);

  /**
   * Finds the full native key while preserving absent optional context.
   *
   * @param key complete contextual native key
   * @return matching pool, including absent tour/group
   */
  @Query(
      """
      select p from PoolEntity p where p.provider = :#{#key.provider} and p.season.id = :#{#key.seasonId}
      and p.organizerReference = :#{#key.organizerReference} and p.competitionReference = :#{#key.competitionReference}
      and p.reference = :#{#key.reference}
      and p.tourReference is not distinct from :#{#key.tourReference}
      and p.groupReference is not distinct from :#{#key.groupReference}
      """)
  Optional<PoolEntity> findByKey(PoolKey key);

  /**
   * Returns all scopes affected by a pack correction.
   *
   * @param packId native grouping
   * @return its current pools, including overrides
   */
  List<PoolEntity> findByPackId(UUID packId);
}
