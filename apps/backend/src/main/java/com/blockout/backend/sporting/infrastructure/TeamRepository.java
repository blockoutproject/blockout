package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
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
}
