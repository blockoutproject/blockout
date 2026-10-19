package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Native Spring Data access to the sporting club owner. */
interface ClubRepository extends JpaRepository<ClubEntity, UUID> {
  /**
   * Selects current seasonless acquisition needs in a bounded page.
   *
   * @param geocoding whether to select current municipal needs
   * @param manual explicit request may repeat an unchanged ordinary no-result
   * @param page bounded native page
   * @return stable FFVB club references with current eligible needs
   */
  @Query(
      """
      select c from ClubEntity c where c.provider = CollectionProviderEnum.FFVB
      and (:geocoding = false or (c.hasCoordinates = false and c.municipalityRestricted = false
        and c.municipality is not null and (:manual = true or c.geocodedRevision is null or c.geocodedRevision <> c.localityRevision)))
      order by c.id
      """)
  List<ClubEntity> acquisitionClubs(boolean geocoding, boolean manual, Pageable page);

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
