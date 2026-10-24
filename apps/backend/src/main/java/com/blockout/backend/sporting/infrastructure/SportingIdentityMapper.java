package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.sporting.application.model.MatchDetails;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.MatchSchedule;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews;
import com.blockout.backend.sporting.application.model.SportingViews.ClubView;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionView;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingViews.PackView;
import com.blockout.backend.sporting.application.model.SportingViews.ParticipationView;
import com.blockout.backend.sporting.application.model.SportingViews.PoolClassificationView;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
import com.blockout.backend.sporting.application.model.StandingsView;
import com.blockout.backend.sporting.domain.MatchFacts;
import java.util.List;
import org.mapstruct.BeanMapping;
import org.mapstruct.IterableMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValueMappingStrategy;

/** Maps persistence values inside their transaction without exporting managed relationships. */
@Mapper(config = MappingConfiguration.class)
interface SportingIdentityMapper {
  /**
   * Exposes native grouping identity without any mapping state.
   *
   * @param source retained native pack
   * @return root preparation entry
   */
  @Mapping(target = "label", source = "reference")
  @Mapping(target = "kind", constant = "PACK")
  @Mapping(target = "parentId", ignore = true)
  SportingViews.CollectionResource toCollectionResource(PackEntity source);

  /**
   * Exposes a pool's original label and parent without classification readiness.
   *
   * @param source retained contextual pool
   * @return direct child preparation entry
   */
  @Mapping(target = "label", source = "sourceName")
  @Mapping(target = "kind", constant = "POOL")
  @Mapping(target = "parentId", source = "pack.id")
  SportingViews.CollectionResource toCollectionResource(PoolEntity source);

  /**
   * Projects acquisition lifecycle without exposing the managed season.
   *
   * @param source canonical managed season
   * @return detached acquisition lifecycle
   */
  SportingViews.CollectionSeasonView toCollectionView(SeasonEntity source);

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
   * Projects division presentation without exposing stored image bytes.
   *
   * @param source current managed division inside the transaction
   * @return detached editor state
   */
  @Mapping(
      target = "gradient",
      expression =
          "java(toGradient(source.getGradientStart(), source.getGradientMiddle(), source.getGradientEnd()))")
  @Mapping(target = "hasLogo", expression = "java(source.getLogo() != null)")
  DivisionDetail toDetail(DivisionEntity source);

  /**
   * Maps editor metadata and database-computed image presence without materializing an entity.
   *
   * @param source projected division metadata
   * @return detached editor state
   */
  @Mapping(
      target = "gradient",
      expression =
          "java(toGradient(source.getGradientStart(), source.getGradientMiddle(), source.getGradientEnd()))")
  DivisionDetail toDetail(DivisionSummary source);

  /**
   * Combines the ordered relational gradient columns, preserving an absent explicit gradient.
   *
   * @param start first explicit color, or null when no gradient is configured
   * @param middle second explicit color when a gradient is configured
   * @param end third explicit color when a gradient is configured
   * @return the three explicit colors, or null for the color-derived treatment
   */
  default List<String> toGradient(String start, String middle, String end) {
    return start == null ? null : List.of(start, middle, end);
  }

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
  default SportingClassification toClassification(PoolEntity source) {
    return source == null || source.getDivision() == null
        ? null
        : new SportingClassification(
            source.getDivision().getId(), source.getFormat(), source.getGender());
  }

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
   * Preserves absence as a missing embeddable rather than a sentinel classification.
   *
   * @param source complete application setting, or null
   * @return the relational setting, or null
   */
  ClassificationSetting toSetting(SportingClassification source);

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

  /**
   * Detaches the currently accepted schedule under its match lock.
   *
   * @param source current match entity
   * @return immutable schedule and independent attribution
   */
  MatchSchedule toSchedule(MatchEntity source);

  /**
   * Copies already-decided facts without changing match identity or participants.
   *
   * @param source application-decided schedule state
   * @param target existing managed match
   */
  @BeanMapping(ignoreByDefault = true)
  @Mapping(target = "localDate", source = "localDate")
  @Mapping(target = "localTime", source = "localTime")
  @Mapping(target = "timeZone", source = "timeZone")
  @Mapping(target = "reliableStart", source = "reliableStart")
  @Mapping(target = "detailUrl", source = "detailUrl")
  @Mapping(target = "acceptedCycleOrder", source = "acceptedCycleOrder")
  @Mapping(target = "acceptedReadOrdinal", source = "acceptedReadOrdinal")
  @Mapping(target = "scheduleObservedAt", source = "scheduleObservedAt")
  @Mapping(target = "schedulePublishedAt", source = "schedulePublishedAt")
  @Mapping(target = "referenceObservedAt", source = "referenceObservedAt")
  @Mapping(target = "referencePublishedAt", source = "referencePublishedAt")
  void updateSchedule(MatchSchedule source, @MappingTarget MatchEntity target);

  /**
   * Maps accepted enrichment without exposing persistent collections.
   *
   * @param source locked current match
   * @return detached current enrichment
   */
  @Mapping(target = "result", source = "source")
  @Mapping(
      target = "sets",
      expression = "java(source.isSetsAvailable() ? toSetScores(source.getSets()) : null)")
  @Mapping(
      target = "referees",
      expression = "java(source.isRefereesAvailable() ? source.getReferees() : null)")
  MatchDetails toDetails(MatchEntity source);

  /**
   * Preserves absence of an overall result instead of constructing an empty result object.
   *
   * @param source current match
   * @return accepted official result, or null
   */
  default MatchObservation.Result toResult(MatchEntity source) {
    return source.getResultState() == null
        ? null
        : new MatchObservation.Result(
            source.getResultState(),
            source.getHomeSets(),
            source.getAwaySets(),
            source.getSpecialLabel());
  }

  /**
   * Copies played sets in their persisted source order.
   *
   * @param source accepted values
   * @return detached points
   */
  List<MatchFacts.SetScore> toSetScores(List<MatchSetValue> source);

  /**
   * Copies decided enrichment while leaving identity and schedule with their owners.
   *
   * @param source accepted values, including qualified withdrawals
   * @param target locked current match
   */
  @BeanMapping(ignoreByDefault = true)
  @Mapping(target = "resultState", source = "result.state")
  @Mapping(target = "homeSets", source = "result.homeSets")
  @Mapping(target = "awaySets", source = "result.awaySets")
  @Mapping(target = "specialLabel", source = "result.specialLabel")
  @Mapping(target = "setsAvailable", expression = "java(source.sets() != null)")
  @Mapping(target = "refereesAvailable", expression = "java(source.referees() != null)")
  @Mapping(target = "sets", source = "sets")
  @Mapping(target = "uninterpretedResult", source = "uninterpretedResult")
  @Mapping(target = "venueName", source = "venueName")
  @Mapping(target = "venueAddress", source = "venueAddress")
  @Mapping(target = "referees", source = "referees")
  @Mapping(target = "professionalStreamUrl", source = "professionalStreamUrl")
  @Mapping(target = "informationSheet", source = "informationSheet")
  @Mapping(target = "scoresheetUrl", source = "scoresheetUrl")
  @Mapping(target = "statisticsUrl", source = "statisticsUrl")
  @Mapping(target = "resultObservedAt", source = "resultObservedAt")
  @Mapping(target = "resultPublishedAt", source = "resultPublishedAt")
  @Mapping(target = "setsObservedAt", source = "setsObservedAt")
  @Mapping(target = "setsPublishedAt", source = "setsPublishedAt")
  @Mapping(target = "venueObservedAt", source = "venueObservedAt")
  @Mapping(target = "venuePublishedAt", source = "venuePublishedAt")
  @Mapping(target = "refereesObservedAt", source = "refereesObservedAt")
  @Mapping(target = "refereesPublishedAt", source = "refereesPublishedAt")
  @Mapping(target = "streamObservedAt", source = "streamObservedAt")
  @Mapping(target = "streamPublishedAt", source = "streamPublishedAt")
  @Mapping(target = "documentsObservedAt", source = "documentsObservedAt")
  @Mapping(target = "documentsPublishedAt", source = "documentsPublishedAt")
  void updateDetails(MatchDetails source, @MappingTarget MatchEntity target);

  /**
   * Detaches the table inside its owning transaction.
   *
   * @param source current scope
   * @return publication evidence and usable table
   */
  StandingsView toView(StandingsEntity source);

  /**
   * Detaches ordered table rows for reads and content comparison before replacing owned rows.
   *
   * @param source current source-ordered persistent rows with their statistics
   * @return immutable row values preserving order, missing links and statistics
   */
  List<StandingsView.Row> toRowViews(List<StandingRowEntity> source);

  /**
   * Replaces only table-owned values; the pool identity remains immutable.
   *
   * @param source accepted publication and table
   * @param target managed scope
   */
  @Mapping(target = "columns", ignore = true)
  @Mapping(target = "rows", ignore = true)
  void updateStandings(StandingsView source, @MappingTarget StandingsEntity target);

  /**
   * Creates an owned row without a supplied persistence identifier.
   *
   * @param source decided official row
   * @return new row for the current table
   */
  @Mapping(target = "id", ignore = true)
  StandingRowEntity toEntity(StandingsView.Row source);

  /**
   * Copies set points without inheriting the match update's property allowlist.
   *
   * @param source accepted played-set points
   * @return persistent value
   */
  MatchSetValue toValue(MatchFacts.SetScore source);

  /**
   * Copies the qualified locator independently from the enclosing update allowlist.
   *
   * @param source accepted document locator, or null for withdrawal
   * @return persistent locator, or null
   */
  InformationSheetValue toValue(MatchObservation.InformationSheet source);

  /**
   * Removes stored rows on qualified absence; the separate availability flag preserves null versus
   * empty.
   *
   * @param source accepted set list, possibly null
   * @return persistent collection, empty when unavailable
   */
  @IterableMapping(nullValueMappingStrategy = NullValueMappingStrategy.RETURN_DEFAULT)
  List<MatchSetValue> toSetValues(List<MatchFacts.SetScore> source);

  /**
   * Copies accepted text collections; null state has no retained collection rows.
   *
   * @param source accepted values, possibly null
   * @return detached persistent values, empty for absence
   */
  @IterableMapping(nullValueMappingStrategy = NullValueMappingStrategy.RETURN_DEFAULT)
  List<String> toStrings(List<String> source);

  /**
   * Builds the source-ordered replacement rows for a published table only.
   *
   * @param source accepted rows
   * @return new owned rows without an observation history
   */
  List<StandingRowEntity> toRows(List<StandingsView.Row> source);
}
