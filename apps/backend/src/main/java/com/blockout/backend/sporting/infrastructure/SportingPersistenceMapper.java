package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.mobile.model.TeamLogoSelectionEnum;
import com.blockout.backend.shared.mapping.TemporalMapping;
import com.blockout.backend.sporting.application.ConsultationStore.MatchInput;
import com.blockout.backend.sporting.application.ConsultationViews.Schedule;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.model.ClubAcquisitionReference;
import com.blockout.backend.sporting.application.model.ClubLocalityView;
import com.blockout.backend.sporting.application.model.MatchDetails;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.MatchSchedule;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.model.SportingPublicInput;
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
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.StandingsView;
import com.blockout.backend.sporting.domain.MatchFacts;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.mapstruct.BeanMapping;
import org.mapstruct.IterableMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValueMappingStrategy;

/** Maps persistence values inside their transaction without exporting managed relationships. */
@Mapper(config = MappingConfiguration.class, uses = TemporalMapping.class)
interface SportingPersistenceMapper {
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
   * Detaches match facts and the fetched pool context while preserving independent observation
   * times. Participant identity access does not initialize their lazy entity references.
   *
   * @param source already selected dated match with its pool season and classification
   * @return accepted consultation inputs and the existing pool presentation without authorizing the
   *     selection
   */
  @Mapping(target = "homeTeamId", source = "homeTeam.id")
  @Mapping(target = "awayTeamId", source = "awayTeam.id")
  @Mapping(target = "season", source = "pool.season")
  @Mapping(target = "classification", source = "pool")
  @Mapping(target = "division", source = "pool.division")
  @Mapping(target = "schedule", source = "source")
  @Mapping(target = "result", source = "source")
  MatchInput toMatchInput(MatchEntity source);

  /**
   * Projects the accepted schedule independently of the result's observation time.
   *
   * @param source current managed match in the caller's consistent read
   * @return detached schedule preserving an absent reliable instant
   */
  @Mapping(target = "instant", source = "reliableStart")
  @Mapping(target = "observedAt", source = "scheduleObservedAt")
  Schedule toConsultationSchedule(MatchEntity source);

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
   * Detaches the currently accepted schedule within the caller's read or mutation transaction.
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
   * @param source current managed match in the caller's read or mutation transaction
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

  /**
   * Detaches one qualified alias from the persistence query projection.
   *
   * @param source existing scoped alias
   * @return the same matching facts without persistence ownership
   */
  @Mapping(target = "name", source = "comparisonName")
  SportingPublicInput.Alias toView(SportingAliasRow source);

  /**
   * Combines scalar query values with already batched owner associations.
   *
   * @param source current permitted scalar projection
   * @param kind owning resource kind
   * @param aliases qualified aliases for this resource
   * @param divisionTerms current terms for its division
   * @param visiblePoolIds already authorized current memberships
   * @return detached permitted search input with no additional reads
   */
  @Mapping(target = "classification", source = "source")
  @Mapping(target = "poolIds", source = "visiblePoolIds")
  SportingPublicInput toPublicInput(
      SportingSearchRow source,
      SportingVisibility.Kind kind,
      Set<SportingPublicInput.Alias> aliases,
      Set<String> divisionTerms,
      List<UUID> visiblePoolIds);

  /**
   * Retains unknown classification instead of constructing an empty setting.
   *
   * @param source current scalar projection
   * @return accepted classification, or null without a division
   */
  default SportingClassification toClassification(SportingSearchRow source) {
    return source.divisionId() == null
        ? null
        : new SportingClassification(source.divisionId(), source.format(), source.gender());
  }

  /**
   * Restores contact state through the value constructor that discards restricted content.
   *
   * @param source current relational field, including any restored restricted columns
   * @return permitted immutable field state
   */
  SportingPresentation.ContactValue toContactValue(ClubContactValue source);

  /**
   * Stores current already-decided contact values without retaining history.
   *
   * @param source permitted owner value
   * @return relational field value
   */
  ClubContactValue toContactEntity(SportingPresentation.ContactValue source);

  /**
   * Detaches all independently owned contact fields, preserving their exact keys.
   *
   * @param source relational current fields
   * @return immutable values whose constructors apply privacy restrictions
   */
  Map<SportingPresentation.ContactField, SportingPresentation.ContactValue> toContactValues(
      Map<SportingPresentation.ContactField, ClubContactValue> source);

  /**
   * Converts a complete owner-approved replacement into relational values.
   *
   * @param source all current independently decided fields
   * @return replacement values without prior content
   */
  Map<SportingPresentation.ContactField, ClubContactValue> toContactEntities(
      Map<SportingPresentation.ContactField, SportingPresentation.ContactValue> source);

  /**
   * Detaches current contacts and their separate source attribution inside the transaction.
   *
   * @param source loaded club owner
   * @return complete contact snapshot without managed values
   */
  @Mapping(target = "clubId", source = "id")
  @Mapping(target = "revision", source = "contactsRevision")
  @Mapping(target = "fields", source = "source", qualifiedByName = "contactFields")
  @Mapping(target = "order", source = "source", qualifiedByName = "contactOrder")
  @Mapping(target = "observedAt", source = "detailObservedAt")
  @Mapping(target = "providerPublishedAt", source = "detailPublishedAt")
  SportingPresentation.Contacts toContacts(ClubEntity source);

  /**
   * Selects all current relational contact values before their privacy-aware conversion.
   *
   * @param source loaded club owner
   * @return detached permitted fields
   */
  @Named("contactFields")
  default Map<SportingPresentation.ContactField, SportingPresentation.ContactValue> contactFields(
      ClubEntity source) {
    return toContactValues(source.contactValues());
  }

  /**
   * Preserves absence of source-page attribution before the first accepted observation.
   *
   * @param source loaded club owner
   * @return accepted logical order, or null
   */
  @Named("contactOrder")
  default ObservationOrder contactOrder(ClubEntity source) {
    return toOrder(source.getDetailCycleOrder(), source.getDetailReadOrdinal());
  }

  /**
   * Preserves absence before first acceptance without a sentinel order.
   *
   * @param cycle backend cycle order, null before acceptance
   * @param ordinal pre-read ordinal paired with that cycle
   * @return logical token, or null before acceptance
   */
  default ObservationOrder toOrder(Long cycle, Long ordinal) {
    return cycle == null ? null : new ObservationOrder(cycle, ordinal);
  }

  /**
   * Maps managed club state for editor reads/writes, calendar admission and fetched-graph
   * composition. Already loaded state needs no additional scalar presentation query.
   *
   * @param source managed club in the caller's transaction
   * @return detached presentation using the common scalar presentation rule
   */
  default SportingPresentation.View toPresentation(ClubEntity source) {
    return toPresentation(
        new SportingPresentationRow(
            source.getId(),
            source.getSourceName(),
            source.getManualName(),
            null,
            source.getPresentationRevision(),
            null,
            source.getLogo() != null,
            false,
            null,
            false),
        Kind.CLUB);
  }

  /**
   * Maps managed team/club state for editor reads/writes and calendar selector admission. Public
   * match summaries use scalar presentation reads instead of loading this entity graph.
   *
   * @param source managed team and optional club in the caller's transaction
   * @return detached presentation using the common scalar presentation rule
   */
  default SportingPresentation.View toPresentation(TeamEntity source) {
    ClubEntity club = source.getClub();
    return toPresentation(
        new SportingPresentationRow(
            source.getId(),
            source.getSourceName(),
            source.getManualName(),
            source.getManualShortName(),
            source.getPresentationRevision(),
            source.getProvider(),
            source.getLogo() != null,
            source.getSourceLogo() != null,
            club == null ? null : club.getId(),
            club != null && club.getLogo() != null),
        Kind.TEAM);
  }

  /**
   * Maps managed pool names for editor reads/writes, calendar selector admission and detached match
   * context without inventing artwork or re-querying an already loaded presentation.
   *
   * @param source managed pool in the caller's transaction
   * @return detached presentation using the common scalar presentation rule
   */
  default SportingPresentation.View toPresentation(PoolEntity source) {
    return toPresentation(
        new SportingPresentationRow(
            source.getId(),
            source.getSourceName(),
            source.getManualName(),
            source.getManualShortName(),
            source.getPresentationRevision(),
            null,
            false,
            false,
            null,
            false),
        Kind.POOL);
  }

  /**
   * Resolves the same current names and artwork precedence for editor and public batch reads.
   *
   * @param source scalar owner facts, including image presence without its bytes
   * @param kind club, team or pool presentation owner
   * @return detached presentation with its own resource editing revision and current artwork
   */
  default SportingPresentation.View toPresentation(SportingPresentationRow source, Kind kind) {
    SportingPresentation.Logo logo = null;
    String revision = Long.toString(source.revision());
    switch (kind) {
      case CLUB -> {
        String manual = source.hasLogo() ? "/clubs/" + source.id() + "/logo" : null;
        logo = new SportingPresentation.Logo(manual, manual, null);
      }
      case TEAM -> {
        String manual = source.hasLogo() ? "/teams/" + source.id() + "/logo" : null;
        String automatic =
            source.provider() == CollectionProviderEnum.LNV && source.hasSourceLogo()
                ? "/teams/"
                    + source.id()
                    + "/logo?selection="
                    + TeamLogoSelectionEnum.AUTOMATIC.getValue()
                : source.clubHasLogo() ? "/clubs/" + source.clubId() + "/logo" : null;
        logo =
            new SportingPresentation.Logo(manual == null ? automatic : manual, manual, automatic);
      }
      case POOL -> {}
      default -> throw new IllegalArgumentException("Unsupported presentation kind");
    }
    return new SportingPresentation.View(
        source.id(),
        kind,
        revision,
        SportingPresentation.Names.resolve(
            source.sourceName(), source.manualName(), source.manualShortName(), kind != Kind.CLUB),
        logo);
  }

  /**
   * Projects native club acquisition evidence and the exact current geocoding revision.
   *
   * @param source loaded acquisition owner
   * @return detached original reference and prior locality attribution
   */
  default ClubAcquisitionReference toAcquisitionReference(ClubEntity source) {
    return new ClubAcquisitionReference(
        source.getId(),
        source.getReference(),
        source.getProvider(),
        Objects.equals(source.getGeocodedRevision(), source.getLocalityRevision()),
        toOrder(source.getLocalityCycleOrder(), source.getLocalityReadOrdinal()));
  }

  /**
   * Prevents a postal code from supplying a geocoding target without a permitted city.
   *
   * @param source loaded club owner
   * @return current municipal acquisition context
   */
  default ClubLocalityView toLocalityView(ClubEntity source) {
    String city = toContactValue(source.getCity()).effectiveValue();
    return new ClubLocalityView(
        Long.toString(source.getLocalityRevision()),
        city,
        city == null ? null : toContactValue(source.getPostalCode()).effectiveValue());
  }

  /**
   * Preserves location absence whenever the current city is hidden or restricted.
   *
   * @param source loaded club owner
   * @return permitted current locality with its independent logical order
   */
  default SportingPresentation.Locality toLocality(ClubEntity source) {
    return toLocality(
        new ClubLocalityRow(
            source.getId(),
            source.getLocalityRevision(),
            source.getCity(),
            source.getPostalCode(),
            source.getLatitude(),
            source.getLongitude(),
            source.getLocalityCycleOrder(),
            source.getLocalityReadOrdinal()));
  }

  /**
   * Applies the same current-contact restriction to entity and scalar municipality reads.
   *
   * @param source detached municipality fields without artwork
   * @return permitted point with its original logical attribution, never an old hidden city
   */
  default SportingPresentation.Locality toLocality(ClubLocalityRow source) {
    String city = toContactValue(source.city()).effectiveValue();
    return new SportingPresentation.Locality(
        Long.toString(source.localityRevision()),
        city,
        toContactValue(source.postalCode()).effectiveValue(),
        city == null ? null : source.latitude(),
        city == null ? null : source.longitude(),
        toOrder(source.localityCycleOrder(), source.localityReadOrdinal()));
  }
}
