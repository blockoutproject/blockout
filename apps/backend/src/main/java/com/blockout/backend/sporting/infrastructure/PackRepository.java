package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.sporting.domain.SportingProvider;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

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
      SportingProvider provider, UUID seasonId, String organizerReference, String reference);
}
