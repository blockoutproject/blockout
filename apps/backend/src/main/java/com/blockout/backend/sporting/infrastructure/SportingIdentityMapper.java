package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.sporting.application.PoolKey;
import com.blockout.backend.sporting.application.SportingClassification;
import com.blockout.backend.sporting.application.SportingViews.ClubView;
import com.blockout.backend.sporting.application.SportingViews.DivisionView;
import com.blockout.backend.sporting.application.SportingViews.MatchView;
import com.blockout.backend.sporting.application.SportingViews.PackView;
import com.blockout.backend.sporting.application.SportingViews.ParticipationView;
import com.blockout.backend.sporting.application.SportingViews.PoolClassificationView;
import com.blockout.backend.sporting.application.SportingViews.PoolView;
import com.blockout.backend.sporting.application.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.SportingViews.TeamView;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Detaches persistence owners inside their transaction without exporting managed relationships. */
@Mapper(config = MappingConfiguration.class)
interface SportingIdentityMapper {
  /**
   * Detaches the canonical season.
   *
   * @param source canonical persisted season
   * @return immutable identity
   */
  SeasonView toView(SeasonEntity source);

  /**
   * Detaches the persistent organization.
   *
   * @param source persistent organization
   * @return available immutable identity
   */
  ClubView toView(ClubEntity source);

  /**
   * Detaches the division state and controlled terms.
   *
   * @param source current administered division
   * @return detached identity and search terms
   */
  DivisionView toView(DivisionEntity source);

  /**
   * Detaches the pool identity and classification.
   *
   * @param source contextual pool
   * @return detached identity and classification
   */
  @Mapping(target = "key", source = "source")
  @Mapping(target = "packId", source = "pack.id")
  @Mapping(target = "classification", source = "source")
  PoolView toView(PoolEntity source);

  /**
   * Extracts the full native pool identity.
   *
   * @param source qualified pool
   * @return its complete native key
   */
  @Mapping(target = "seasonId", source = "season.id")
  PoolKey toKey(PoolEntity source);

  /**
   * Extracts the accepted pool classification.
   *
   * @param source pool classification owner
   * @return complete accepted classification
   */
  @Mapping(target = "divisionId", source = "division.id")
  SportingClassification toClassification(PoolEntity source);

  /**
   * Extracts the accepted team classification.
   *
   * @param source team classification owner
   * @return complete accepted classification
   */
  @Mapping(target = "divisionId", source = "division.id")
  SportingClassification toClassification(TeamEntity source);

  /**
   * Detaches the seasonal team and its owner references.
   *
   * @param source seasonal team
   * @return immutable owner identity
   */
  @Mapping(target = "seasonId", source = "season.id")
  @Mapping(target = "clubId", source = "club.id")
  @Mapping(target = "classification", source = "source")
  TeamView toView(TeamEntity source);

  /**
   * Detaches the encounter and its participant references.
   *
   * @param source native encounter
   * @return immutable participant references
   */
  @Mapping(target = "poolId", source = "pool.id")
  @Mapping(target = "homeTeamId", source = "homeTeam.id")
  @Mapping(target = "awayTeamId", source = "awayTeam.id")
  MatchView toView(MatchEntity source);

  /**
   * Detaches a complete acquisition setting without inventing an absent value.
   *
   * @param source persisted complete setting, or null
   * @return detached complete value, or null
   */
  @Mapping(target = "divisionId", source = "settingDivisionId")
  @Mapping(target = "format", source = "settingFormat")
  @Mapping(target = "gender", source = "settingGender")
  SportingClassification toClassification(ClassificationSetting source);

  /**
   * Extracts a pack's canonical season and current default.
   *
   * @param source current managed grouping
   * @return immutable classification editor state
   */
  @Mapping(target = "seasonId", source = "season.id")
  PackView toView(PackEntity source);

  /**
   * Detaches published and acquisition state for the pool editor.
   *
   * @param source current managed pool
   * @return detached owner state
   */
  @Mapping(target = "pool", source = "source")
  PoolClassificationView toClassificationView(PoolEntity source);

  /**
   * Detaches one retained participation without filtering away absent relationships.
   *
   * @param source current or absent participation
   * @return immutable references and published classification
   */
  @Mapping(target = "teamId", source = "team.id")
  @Mapping(target = "poolId", source = "pool.id")
  @Mapping(target = "classification", source = "pool")
  ParticipationView toView(ParticipationEntity source);
}
