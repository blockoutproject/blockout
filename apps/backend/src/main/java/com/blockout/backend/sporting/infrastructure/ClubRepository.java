package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Native Spring Data access to the sporting club owner. */
interface ClubRepository extends JpaRepository<ClubEntity, UUID> {
  /**
   * Finds the exact provider-qualified persistent organization.
   *
   * @param provider native authority
   * @param reference exact code
   * @return persistent club
   */
  Optional<ClubEntity> findByProviderAndReference(
      CollectionProviderEnum provider, String reference);
}
