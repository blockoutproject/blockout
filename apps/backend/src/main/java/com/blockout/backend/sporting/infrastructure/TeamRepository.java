package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.sporting.application.SportingViews.PoolView;
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
      select t from TeamEntity t join t.aliases a
      where t.provider = :#{#pool.key.provider} and t.season.id = :#{#pool.key.seasonId}
      and t.club.id = :clubId and t.division.id = :#{#pool.classification.divisionId}
      and t.format = :#{#pool.classification.format} and t.gender = :#{#pool.classification.gender}
      and a.seasonId = :#{#pool.key.seasonId} and a.organizerReference = :#{#pool.key.organizerReference}
      and a.competitionReference = :#{#pool.key.competitionReference} and a.comparisonName = :name
      """)
  Optional<TeamEntity> findByVerifiedAlias(PoolView pool, UUID clubId, String name);
}
