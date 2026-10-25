package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Native Spring Data access to the sporting team owner. */
interface TeamRepository extends JpaRepository<TeamEntity, UUID> {
  /**
   * Finds the FFVB season/club/classification/name identity.
   *
   * @param provider designated FFVB identity authority
   * @param seasonId canonical season
   * @param clubId established club
   * @param divisionId division
   * @param format format
   * @param gender gender
   * @param name established comparison
   * @return FFVB team
   */
  Optional<TeamEntity>
      findByProviderAndSeasonIdAndClubIdAndDivisionIdAndFormatAndGenderAndComparisonName(
          CollectionProviderEnum provider,
          UUID seasonId,
          UUID clubId,
          UUID divisionId,
          SportFormatEnum format,
          SportGenderEnum gender,
          String name);

  /**
   * Finds the professional season/championship/TeamID identity.
   *
   * @param provider native authority
   * @param seasonId canonical season
   * @param organizerReference binding context
   * @param competitionReference championship
   * @param nativeReference TeamID
   * @return professional team
   */
  Optional<TeamEntity>
      findByProviderAndSeasonIdAndOrganizerReferenceAndCompetitionReferenceAndNativeReference(
          CollectionProviderEnum provider,
          UUID seasonId,
          String organizerReference,
          String competitionReference,
          String nativeReference);

  /**
   * Resolves only a verified alias within its owner and qualified context.
   *
   * @param pool current qualified context
   * @param clubId established club
   * @param name exact verified alias
   * @return scoped FFVB association
   */
  @Query(
      """
      SELECT t FROM TeamEntity t JOIN t.aliases a
      WHERE t.provider = :#{#pool.key.provider} AND t.season.id = :#{#pool.key.seasonId}
      AND t.club.id = :clubId AND t.division.id = :#{#pool.classification.divisionId}
      AND t.format = :#{#pool.classification.format} AND t.gender = :#{#pool.classification.gender}
      AND a.seasonId = :#{#pool.key.seasonId} AND a.organizerReference = :#{#pool.key.organizerReference}
      AND a.competitionReference = :#{#pool.key.competitionReference} AND a.comparisonName = :name
      """)
  Optional<TeamEntity> findByVerifiedAlias(PoolView pool, UUID clubId, String name);

  /**
   * Reads each affected team once, independently from its number of participations.
   *
   * @param poolIds affected correction scopes
   * @return distinct participating teams
   */
  @Query(
      "SELECT t FROM TeamEntity t WHERE EXISTS (SELECT p.id FROM ParticipationEntity p WHERE p.team = t AND p.pool.id IN :poolIds)")
  List<TeamEntity> findParticipatingIn(List<UUID> poolIds);

  /**
   * Resolves canonical-name and qualified-alias collisions in the corrected scope and against
   * existing target teams. Names are global within a season/club/classification; two aliases
   * collide only in the same organizer/competition context of their owners' season.
   *
   * @param teamIds affected teams in the locked season
   * @param classification proposed complete target
   * @return distinct conflicting existing team identities
   */
  @Query(
      """
      SELECT DISTINCT target.id
      FROM TeamEntity original LEFT JOIN original.aliases originalAlias,
           TeamEntity target LEFT JOIN target.aliases targetAlias
      WHERE original.id IN :teamIds AND original.provider = com.blockout.backend.generated.ingestion.model.CollectionProviderEnum.FFVB
      AND target.provider = original.provider AND target.season = original.season
      AND target.club = original.club
      AND (target.id IN :teamIds OR (
        target.division.id = :#{#classification.divisionId}
        AND target.format = :#{#classification.format} AND target.gender = :#{#classification.gender}
      ))
      AND target.id <> original.id
      AND (
        target.comparisonName = original.comparisonName
        OR (originalAlias.seasonId = original.season.id
            AND originalAlias.comparisonName = target.comparisonName)
        OR (targetAlias.seasonId = target.season.id
            AND targetAlias.comparisonName = original.comparisonName)
        OR (originalAlias.seasonId = original.season.id AND targetAlias.seasonId = target.season.id
            AND originalAlias.organizerReference = targetAlias.organizerReference
            AND originalAlias.competitionReference = targetAlias.competitionReference
            AND originalAlias.comparisonName = targetAlias.comparisonName)
      )
      """)
  List<UUID> findClassificationCollisions(
      List<UUID> teamIds, SportingClassification classification);

  /**
   * Reads current established participants without recreating missing table identities.
   *
   * @param poolId table scope
   * @return current participating teams only
   */
  @Query(
      "SELECT t FROM TeamEntity t WHERE EXISTS (SELECT p.id FROM ParticipationEntity p WHERE p.team = t AND p.pool.id = :poolId AND p.current = TRUE)")
  List<TeamEntity> findCurrentIn(UUID poolId);

  /** Canonical team eligibility for queries using the team alias t. */
  String VISIBLE =
      "t.division.active = TRUE AND EXISTS (SELECT r.id FROM ParticipationEntity r JOIN r.pool p WHERE r.team = t AND r.current = TRUE AND "
          + PoolRepository.VISIBLE
          + ")";

  /**
   * Resolves immutable season ownership before loading state protected by its lock.
   *
   * @param id exact team identity
   * @return its season, or empty for an unknown team
   */
  @Query("SELECT t.season.id FROM TeamEntity t WHERE t.id = :id")
  Optional<UUID> findSeasonId(UUID id);

  /**
   * Reads classification activity without loading team presentation.
   *
   * @param id exact team identity
   * @return current activity, or empty for an unknown team
   */
  @Query("SELECT t.division.active FROM TeamEntity t WHERE t.id = :id")
  Optional<Boolean> findDivisionActivity(UUID id);

  /**
   * Selects the distinct seasons containing currently visible club teams.
   *
   * @param clubId exact club identity
   * @return canonical seasons newest first
   */
  @Query(
      "SELECT DISTINCT s FROM TeamEntity t JOIN t.season s WHERE t.club.id = :clubId AND "
          + VISIBLE
          + " ORDER BY s.startYear DESC, s.id")
  List<SeasonEntity> findVisibleClubSeasons(UUID clubId);

  /**
   * Selects current teams in a club season whose parents are already loaded by the caller.
   *
   * @param clubId admitted club
   * @param seasonId admitted season
   * @return visible teams in stable identity order
   */
  @Query(
      "SELECT t FROM TeamEntity t WHERE t.club.id = :clubId AND t.season.id = :seasonId AND "
          + VISIBLE
          + " ORDER BY t.id")
  List<TeamEntity> findVisibleClubTeams(UUID clubId, UUID seasonId);

  /**
   * Selects eligible search identities before bounded hydration.
   *
   * @param page bounded projection request
   * @return visible identities in stable order
   */
  @Query("SELECT t.id FROM TeamEntity t WHERE " + VISIBLE + " ORDER BY t.id")
  List<UUID> findProjectionIds(Pageable page);

  /**
   * Projects public search facts with optional club context and no image payloads.
   *
   * @param ids bounded candidate identities
   * @return currently visible search facts in identity order
   */
  @Query(
      """
      SELECT NEW com.blockout.backend.sporting.infrastructure.SportingSearchRow(
        t.id, t.season.id, t.sourceName, COALESCE(t.manualName, t.sourceName), COALESCE(t.manualShortName, t.sourceName), t.division.id, t.division.name, t.format, t.gender,
        c.id, COALESCE(c.manualName, c.sourceName),
        CASE WHEN c.city.restricted = TRUE OR c.city.mode = ContactModeEnum.HIDDEN THEN NULL WHEN c.city.mode = ContactModeEnum.MANUAL THEN c.city.manualValue ELSE c.city.sourceValue END)
      FROM TeamEntity t LEFT JOIN t.club c WHERE t.id IN :ids AND
      """
          + VISIBLE
          + " ORDER BY t.id")
  List<SportingSearchRow> findSearchInputs(Set<UUID> ids);

  /**
   * Reads qualified aliases for selected teams without initializing collections.
   *
   * @param ids bounded team identities
   * @return owner-keyed alias facts
   */
  @Query(
      """
      SELECT NEW com.blockout.backend.sporting.infrastructure.SportingAliasRow(
        t.id, a.seasonId, a.organizerReference, a.competitionReference, a.comparisonName)
      FROM TeamEntity t JOIN t.aliases a WHERE t.id IN :ids
      """)
  List<SportingAliasRow> findAliases(Set<UUID> ids);

  /**
   * Finds owners affected by classification or season changes, including hidden owners.
   *
   * @param divisions changed divisions, possibly empty
   * @param seasons changed seasons, possibly empty
   * @return dependent team identities
   */
  @Query(
      "SELECT t.id FROM TeamEntity t WHERE t.division.id IN :divisions OR t.season.id IN :seasons")
  List<UUID> findProjectionDependents(Set<UUID> divisions, Set<UUID> seasons);

  /**
   * Finds teams affected by a club presentation or locality change.
   *
   * @param clubs changed club identities
   * @return dependent teams, including currently hidden owners
   */
  @Query("SELECT t.id FROM TeamEntity t WHERE t.club.id IN :clubs")
  List<UUID> findIdsByClubIds(Set<UUID> clubs);
}
