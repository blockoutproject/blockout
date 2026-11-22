package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.mobile.model.CollectionResourceKindEnum;
import com.blockout.backend.sporting.application.model.SportingViews;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Native Spring Data access to the sporting pack owner. */
interface PackRepository extends JpaRepository<PackEntity, UUID> {
  /**
   * Pages native packs with current catalogue membership and their pool counts.
   *
   * @param seasonId exact source season
   * @param provider designated provider
   * @param organizerReference source organizer
   * @param pageable bounded configuration read
   * @return stable reference/identity slice
   */
  @Query(
      """
      SELECT NEW com.blockout.backend.sporting.infrastructure.PackRepository$CatalogPack(
        p.id, p.reference, COUNT(pool.id))
      FROM PackEntity p JOIN PoolEntity pool ON pool.pack = p AND pool.catalogEligible = TRUE
      WHERE p.season.id = :seasonId AND p.provider = :provider
        AND p.organizerReference = :organizerReference
      GROUP BY p.id, p.reference ORDER BY p.reference, p.id
      """)
  Slice<CatalogPack> catalogPacks(
      UUID seasonId, CollectionProviderEnum provider, String organizerReference, Pageable pageable);

  /** Bounded pack projection without consulting acquisition classification or calendar presence. */
  record CatalogPack(UUID id, String reference, long poolCount) {
    SportingViews.CollectionResource toResource() {
      return new SportingViews.CollectionResource(
          id,
          reference,
          CollectionResourceKindEnum.PACK,
          null,
          null,
          null,
          Math.toIntExact(poolCount));
    }
  }

  boolean existsByIdAndSeasonIdAndProviderAndOrganizerReference(
      UUID id, UUID seasonId, CollectionProviderEnum provider, String organizerReference);

  /**
   * Finds the native grouping in its qualified season/source context.
   *
   * @param provider native source
   * @param seasonId canonical season
   * @param organizerReference binding context
   * @param reference native grouping
   * @return existing pack
   */
  Optional<PackEntity> findByProviderAndSeasonIdAndOrganizerReferenceAndReference(
      CollectionProviderEnum provider, UUID seasonId, String organizerReference, String reference);

  /**
   * Resolves the canonical season without caching mutable pack state before its lock.
   *
   * @param id requested pack
   * @return immutable season owner, or empty
   */
  @Query("SELECT p.season.id FROM PackEntity p WHERE p.id = :id")
  Optional<UUID> findSeasonId(UUID id);
}
