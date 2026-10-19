package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Native Spring Data access to the sporting pack owner. */
interface PackRepository extends JpaRepository<PackEntity, UUID> {
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
  @Query("select p.season.id from PackEntity p where p.id = :id")
  Optional<UUID> findSeasonId(UUID id);
}
