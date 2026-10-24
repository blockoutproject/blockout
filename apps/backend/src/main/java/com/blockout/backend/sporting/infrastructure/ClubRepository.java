package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

/** Native Spring Data access to the sporting club owner. */
interface ClubRepository extends JpaRepository<ClubEntity, UUID> {
  /**
   * Selects current seasonless acquisition needs strictly after the visited identity boundary.
   *
   * @param geocoding whether to select current municipal needs
   * @param manual explicit request may repeat an unchanged ordinary no-result
   * @param afterId exclusive last visited identity, or null to start
   * @param page first page limiting the next batch
   * @return stable FFVB club references with current eligible needs
   */
  @Query(
      """
      SELECT c FROM ClubEntity c WHERE c.provider = CollectionProviderEnum.FFVB
      AND (:afterId IS NULL OR c.id > :afterId)
      AND (:geocoding = FALSE OR (c.hasCoordinates = FALSE AND c.city.restricted = FALSE
        AND c.city.mode <> ContactModeEnum.HIDDEN
        AND (CASE WHEN c.city.mode = ContactModeEnum.MANUAL THEN c.city.manualValue ELSE c.city.sourceValue END) IS NOT NULL
        AND (:manual = TRUE OR c.geocodedRevision IS NULL OR c.geocodedRevision <> c.localityRevision)))
      ORDER BY c.id
      """)
  List<ClubEntity> acquisitionClubs(boolean geocoding, boolean manual, UUID afterId, Pageable page);

  /**
   * Finds the exact provider-qualified persistent organization.
   *
   * @param provider native authority
   * @param reference exact code
   * @return persistent club
   */
  Optional<ClubEntity> findByProviderAndReference(
      CollectionProviderEnum provider, String reference);

  /**
   * Serializes source contacts, ordinary edits and rights restrictions on the persistent club.
   *
   * @param id stable organization
   * @return managed owner locked through caller commit
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT c FROM ClubEntity c WHERE c.id = :id")
  Optional<ClubEntity> lockById(UUID id);
}
