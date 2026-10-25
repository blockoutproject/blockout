package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

/** Native Spring Data access to the sporting club owner. */
interface ClubRepository extends JpaRepository<ClubEntity, UUID> {
  /**
   * Selects current seasonless acquisition candidates strictly after the visited identity boundary.
   *
   * @param geocoding whether to select current municipal needs
   * @param afterId exclusive last visited identity, or null to start
   * @param page first page limiting the next batch
   * @return stable FFVB candidates; F01 decides whether a normal unresolved result is due again
   */
  @Query(
      """
      SELECT c FROM ClubEntity c WHERE c.provider = CollectionProviderEnum.FFVB
      AND (:afterId IS NULL OR c.id > :afterId)
      AND (:geocoding = FALSE OR (c.latitude IS NULL AND c.city.restricted = FALSE
        AND c.city.mode <> ContactModeEnum.HIDDEN
        AND (CASE WHEN c.city.mode = ContactModeEnum.MANUAL THEN c.city.manualValue ELSE c.city.sourceValue END) IS NOT NULL))
      ORDER BY c.id
      """)
  List<ClubEntity> acquisitionClubs(boolean geocoding, UUID afterId, Pageable page);

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
  Optional<ClubEntity> findByIdForUpdate(UUID id);

  /**
   * Selects bounded search roots in stable identity order.
   *
   * @param page bounded projection request
   * @return the next club identities
   */
  @Query("SELECT c.id FROM ClubEntity c ORDER BY c.id")
  List<UUID> findProjectionIds(Pageable page);

  /**
   * Projects current names and permitted locality without loading image bytes.
   *
   * @param ids bounded club identities
   * @return public search inputs ordered by identity
   */
  @Query(
      """
      SELECT NEW com.blockout.backend.sporting.infrastructure.SportingSearchRow(
        c.id, NULL, c.sourceName, COALESCE(c.manualName, c.sourceName), NULL, NULL, NULL, NULL, NULL, NULL, NULL,
        CASE WHEN c.city.restricted = TRUE OR c.city.mode = ContactModeEnum.HIDDEN THEN NULL WHEN c.city.mode = ContactModeEnum.MANUAL THEN c.city.manualValue ELSE c.city.sourceValue END)
      FROM ClubEntity c WHERE c.id IN :ids ORDER BY c.id
      """)
  List<SportingSearchRow> findSearchInputs(Set<UUID> ids);

  /**
   * Reads qualified aliases for a bounded owner selection.
   *
   * @param ids selected clubs
   * @return owner-keyed alias facts without initializing entity collections
   */
  @Query(
      """
      SELECT NEW com.blockout.backend.sporting.infrastructure.SportingAliasRow(
        c.id, a.seasonId, a.organizerReference, a.competitionReference, a.comparisonName)
      FROM ClubEntity c JOIN c.aliases a WHERE c.id IN :ids
      """)
  List<SportingAliasRow> findAliases(Set<UUID> ids);
}
