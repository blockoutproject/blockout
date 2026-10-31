package com.blockout.backend.sporting.application;

import com.blockout.backend.collection.application.model.CollectionAttempt;
import com.blockout.backend.collection.application.service.ReadCollectionWork;
import com.blockout.backend.contributions.application.ReadPublicContribution;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.StandingsPublicationStateEnum;
import com.blockout.backend.generated.mobile.model.StandingsAvailabilityEnum;
import com.blockout.backend.generated.mobile.model.TeamLogoSelectionEnum;
import com.blockout.backend.shared.mapping.TemporalMapping;
import com.blockout.backend.sporting.application.ConsultationRequest.ClubSeasonRequest;
import com.blockout.backend.sporting.application.ConsultationStore.MatchInput;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.MatchDetails;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.model.SportingPresentation.Locality;
import com.blockout.backend.sporting.application.model.SportingPresentation.View;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.model.StandingsView;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Current public reads; F12 admits HTTP requests and F02 retains all sporting/image authority. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ReadSportingResources {
  private final ConsultationStore reads;
  private final ReadSportingData owners;
  private final SportingStore facts;
  private final ConsultationViewMapper mapper;
  private final Clock clock;
  private final ReadPublicContribution contributions;
  private final ReadCollectionWork collection;
  private final ReadMatchDocument documents;

  /**
   * Reads only the current public club identity for summary consumers.
   *
   * @param id exact club identity
   * @return current permitted names and logo link
   * @throws SportingResourceNotFoundException when the identity is unavailable
   */
  public ConsultationViews.Identity clubIdentity(UUID id) {
    owners
        .visibility(Kind.CLUB, id)
        .filter(SportingVisibility::viewable)
        .orElseThrow(SportingResourceNotFoundException::new);
    return Objects.requireNonNull(clubIdentities(Set.of(id)).get(id));
  }

  /**
   * Reads exact current club facts and viewable seasons.
   *
   * @param id addressed club identity
   * @return detached permitted facts
   * @throws SportingResourceNotFoundException when the identity is unavailable
   */
  public ConsultationViews.ClubDetail club(UUID id) {
    ConsultationViews.Identity club = clubIdentity(id);
    Map<ContactField, String> contacts = owners.publicClubContacts(id);
    return new ConsultationViews.ClubDetail(
        club,
        mapper.toView(contacts),
        owners
            .publicLocality(id)
            .filter(value -> value.latitude() != null && value.longitude() != null)
            .map(mapper::toView)
            .orElse(null),
        owners.publicClubSeasons(id));
  }

  /**
   * Reads every viewable team in an explicitly selected club season.
   *
   * @param request exact club/season without fallback
   * @return possibly empty successful selection
   * @throws SportingResourceNotFoundException when club or season is unknown
   */
  public ConsultationViews.ClubTeams clubTeams(ClubSeasonRequest request) {
    clubIdentity(request.clubId());
    if (owners.season(request.seasonId()).isEmpty()) throw new SportingResourceNotFoundException();
    List<TeamView> selected = owners.publicClubTeams(request.clubId(), request.seasonId());
    List<ConsultationViews.TeamSummary> teams =
        composeTeams(selected).values().stream()
            .sorted(
                Comparator.comparing((ConsultationViews.TeamSummary value) -> value.team().name())
                    .thenComparing(value -> value.team().id()))
            .toList();
    return new ConsultationViews.ClubTeams(request.seasonId(), teams);
  }

  /**
   * Reads the current seasonal team summary without its participation detail collection.
   *
   * @param id exact seasonal team identity
   * @return detached current identity, season, classification and optional club
   * @throws SportingResourceNotFoundException when the team is currently unavailable
   */
  public ConsultationViews.TeamSummary teamSummary(UUID id) {
    owners
        .visibility(Kind.TEAM, id)
        .filter(SportingVisibility::viewable)
        .orElseThrow(SportingResourceNotFoundException::new);
    return Objects.requireNonNull(teamSummaries(Set.of(id)).get(id));
  }

  /**
   * Reads the exact seasonal team and its visible participations.
   *
   * @param id stable team identity
   * @return detached current team including optional club
   * @throws SportingResourceNotFoundException when currently unavailable
   */
  public ConsultationViews.TeamDetail team(UUID id) {
    ConsultationViews.TeamSummary summary = teamSummary(id);
    return new ConsultationViews.TeamDetail(
        summary,
        poolSummaries(Set.copyOf(owners.publicTeamPoolIds(id))).values().stream()
            .sorted(
                Comparator.comparingLong(
                        (ConsultationViews.PoolSummary value) -> value.season().startYear())
                    .reversed()
                    .thenComparing(
                        ConsultationViews.PoolSummary::competitionName,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(value -> value.pool().name())
                    .thenComparing(value -> value.pool().id().toString()))
            .toList());
  }

  /**
   * Reads public pool context independently of official standings.
   *
   * @param id exact contextual pool identity
   * @return detached current pool
   * @throws SportingResourceNotFoundException when currently unavailable
   */
  public ConsultationViews.PoolDetail pool(UUID id) {
    return new ConsultationViews.PoolDetail(poolSummary(id));
  }

  /**
   * Reads the retained official table independently from participants and calendars.
   *
   * @param poolId exact contextual pool
   * @return official order, absence and original table freshness with current acquisition evidence
   * @throws SportingResourceNotFoundException when the pool is hidden or unknown
   */
  public ConsultationViews.Standings standings(UUID poolId) {
    poolSummary(poolId);
    StandingsView source = owners.publicStandings(poolId).orElse(null);
    CollectionAttempt attempt =
        collection.latestAcquisition(poolId, CollectionStageEnum.STANDINGS).orElse(null);
    boolean failed =
        attempt != null
            && attempt.outcome() != CollectionOutcomeEnum.SUCCESS
            && (source == null
                || new ObservationOrder(attempt.cycleOrder(), attempt.readOrdinal())
                        .compareTo(new ObservationOrder(source.cycleOrder(), source.readOrdinal()))
                    > 0);
    if (source == null || !source.tableAvailable()) {
      return new ConsultationViews.Standings(
          poolId,
          source != null && source.publicationState() == StandingsPublicationStateEnum.NOT_PUBLISHED
              ? StandingsAvailabilityEnum.NOT_PUBLISHED
              : StandingsAvailabilityEnum.UNAVAILABLE,
          null,
          failed,
          List.of(),
          List.of());
    }
    Set<UUID> teamIds =
        source.rows().stream()
            .map(StandingsView.Row::teamId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
    Map<UUID, ConsultationViews.Identity> teams =
        facts.presentations(SportingProjectionChanges.Kind.TEAM, teamIds).values().stream()
            .collect(Collectors.toUnmodifiableMap(View::id, mapper::toView));
    return new ConsultationViews.Standings(
        poolId,
        StandingsAvailabilityEnum.AVAILABLE,
        TemporalMapping.toDate(source.tableObservedAt()),
        failed,
        source.columns(),
        source.rows().stream()
            .map(row -> mapper.toView(row, row.teamId() == null ? null : teams.get(row.teamId())))
            .toList());
  }

  /**
   * Reads every current participant independently of official table publication or geography.
   *
   * @param poolId exact contextual pool
   * @return effective-name/UUID ordered participants with only reliable municipality pairs
   * @throws SportingResourceNotFoundException when the pool is hidden or unknown
   */
  public ConsultationViews.Participants participants(UUID poolId) {
    poolSummary(poolId);
    List<ConsultationViews.TeamSummary> teams =
        teamSummaries(reads.participantTeamIds(poolId)).values().stream()
            .sorted(
                Comparator.comparing((ConsultationViews.TeamSummary team) -> team.team().name())
                    .thenComparing(team -> team.team().id()))
            .toList();
    Map<UUID, Locality> localities =
        reads.localities(
            teams.stream()
                .map(ConsultationViews.TeamSummary::club)
                .filter(Objects::nonNull)
                .map(ConsultationViews.Identity::id)
                .collect(Collectors.toSet()));
    return new ConsultationViews.Participants(
        poolId,
        teams.stream()
            .map(
                team -> {
                  Locality locality = team.club() == null ? null : localities.get(team.club().id());
                  ConsultationViews.Location location =
                      locality == null
                              || locality.latitude() == null
                              || locality.longitude() == null
                          ? null
                          : mapper.toView(locality);
                  return new ConsultationViews.Participant(team, location);
                })
            .toList());
  }

  /**
   * Reads current dated match facts without private source references.
   *
   * @param id exact encounter identity
   * @return permitted detail with independent freshness
   * @throws SportingResourceNotFoundException when hidden, dateless or unknown
   */
  public ConsultationViews.MatchDetail match(UUID id) {
    Instant evaluatedAt = clock.instant();
    owners.publicMatch(id).orElseThrow(SportingResourceNotFoundException::new);
    MatchInput input = reads.matches(Set.of(id)).get(id);
    MatchDetails details = facts.matchDetails(id);
    return new ConsultationViews.MatchDetail(
        composeMatchSummaries(List.of(input), evaluatedAt).get(id),
        details.sets() == null
            ? null
            : new ConsultationViews.Sets(
                TemporalMapping.toDate(details.setsObservedAt()), details.sets()),
        details.venueName(),
        details.venueAddress(),
        details.referees(),
        contributions.read(id).map(mapper::toView).orElse(null),
        reads.officialCalendar(input.pool().id()),
        documents.actions(id));
  }

  /**
   * Reads currently available club artwork from its F02 owner.
   *
   * @param id stable club identity
   * @return validated immutable image bytes
   * @throws SportingResourceNotFoundException when owner or image is unavailable
   */
  public Image clubLogo(UUID id) {
    return owners
        .publicLogo(SportingProjectionChanges.Kind.CLUB, id)
        .orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Reads active division artwork under F02 admission.
   *
   * @param id exact division identity
   * @return current immutable image
   * @throws SportingResourceNotFoundException when inactive, missing or without artwork
   */
  public Image divisionLogo(UUID id) {
    return owners
        .publicLogo(SportingProjectionChanges.Kind.DIVISION, id)
        .orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Reads effective or automatic team artwork without bypassing current visibility.
   *
   * @param id exact seasonal team
   * @param selection canonical effective or automatic selection
   * @return selected immutable image
   * @throws SportingResourceNotFoundException when owner or selected image is unavailable
   */
  public Image teamLogo(UUID id, TeamLogoSelectionEnum selection) {
    return owners.publicTeamLogo(id, selection).orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Composes a bounded selection already admitted by the consumer's native sporting predicate.
   * Selection and this hydration remain inside the consumer's consistent read transaction.
   *
   * @param ids at most twenty currently admitted match identities
   * @param now common presentation instant for the whole consumer selection
   * @return current summaries keyed by original identity, without a second paging boundary
   */
  public Map<UUID, ConsultationViews.MatchSummary> matchSummaries(Set<UUID> ids, Instant now) {
    if (ids.size() > 20) throw new IllegalArgumentException("At most twenty matches per read");
    return composeMatchSummaries(reads.matches(ids).values(), now);
  }

  /**
   * Composes current identities already admitted by a consumer in this same consistent snapshot. No
   * visibility decision is inferred from these presentation-only values.
   *
   * @param ids exact currently admitted clubs
   * @return current identities keyed by original ID, with no contacts or retained artwork bytes
   */
  public Map<UUID, ConsultationViews.Identity> clubIdentities(Set<UUID> ids) {
    return facts.presentations(SportingProjectionChanges.Kind.CLUB, ids).values().stream()
        .collect(Collectors.toUnmodifiableMap(View::id, mapper::toView));
  }

  /**
   * Composes a current team selection already admitted by the consumer's sporting read. Selection
   * and hydration must share the caller's consistent transaction.
   *
   * @param ids exact currently admitted seasonal teams
   * @return detached summaries without participation detail or per-team database reads
   */
  public Map<UUID, ConsultationViews.TeamSummary> teamSummaries(Set<UUID> ids) {
    return composeTeams(List.copyOf(reads.teams(ids).values()));
  }

  /**
   * Composes accepted team facts using one read per distinct parent/presentation family.
   *
   * @param teams seasonal teams already admitted in this read transaction
   * @return summaries preserving independent optional club identity and logo precedence
   */
  private Map<UUID, ConsultationViews.TeamSummary> composeTeams(List<TeamView> teams) {
    Set<UUID> ids = teams.stream().map(TeamView::id).collect(Collectors.toSet());
    Map<UUID, View> presentations = facts.presentations(SportingProjectionChanges.Kind.TEAM, ids);
    Map<UUID, ConsultationViews.Identity> clubs =
        clubIdentities(
            teams.stream()
                .map(TeamView::clubId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet()));
    Map<UUID, SeasonView> seasons =
        reads.seasons(teams.stream().map(TeamView::seasonId).collect(Collectors.toSet()));
    Map<UUID, DivisionDetail> divisions =
        reads.divisions(
            teams.stream()
                .map(team -> team.classification().divisionId())
                .collect(Collectors.toSet()));
    return teams.stream()
        .collect(
            Collectors.toUnmodifiableMap(
                TeamView::id,
                team ->
                    new ConsultationViews.TeamSummary(
                        mapper.toView(Objects.requireNonNull(presentations.get(team.id()))),
                        Objects.requireNonNull(seasons.get(team.seasonId())),
                        mapper.toView(
                            team.classification(),
                            Objects.requireNonNull(
                                divisions.get(team.classification().divisionId()))),
                        team.clubId() == null
                            ? null
                            : Objects.requireNonNull(clubs.get(team.clubId())),
                        team.provider() == CollectionProviderEnum.LNV)));
  }

  /**
   * Composes pool summaries already admitted in the caller's current sporting snapshot.
   *
   * @param ids exact currently admitted contextual pools
   * @return detached current pools without a second paging or visibility boundary
   */
  public Map<UUID, ConsultationViews.PoolSummary> poolSummaries(Set<UUID> ids) {
    Map<UUID, PoolView> pools = reads.pools(ids);
    Map<UUID, View> presentations = facts.presentations(SportingProjectionChanges.Kind.POOL, ids);
    Map<UUID, SeasonView> seasons =
        reads.seasons(
            pools.values().stream().map(pool -> pool.key().seasonId()).collect(Collectors.toSet()));
    Map<UUID, DivisionDetail> divisions =
        reads.divisions(
            pools.values().stream()
                .map(pool -> pool.classification().divisionId())
                .collect(Collectors.toSet()));
    return pools.values().stream()
        .collect(
            Collectors.toUnmodifiableMap(
                PoolView::id,
                pool ->
                    new ConsultationViews.PoolSummary(
                        mapper.toView(Objects.requireNonNull(presentations.get(pool.id()))),
                        Objects.requireNonNull(seasons.get(pool.key().seasonId())),
                        mapper.toView(
                            pool.classification(),
                            Objects.requireNonNull(
                                divisions.get(pool.classification().divisionId()))),
                        null,
                        null)));
  }

  /**
   * Admits one pool before combining current season and classification without invented labels.
   *
   * @param id current contextual pool
   * @return permitted pool summary
   * @throws SportingResourceNotFoundException when the pool is hidden or unknown
   */
  private ConsultationViews.PoolSummary poolSummary(UUID id) {
    owners
        .visibility(Kind.POOL, id)
        .filter(SportingVisibility::viewable)
        .orElseThrow(SportingResourceNotFoundException::new);
    return Objects.requireNonNull(poolSummaries(Set.of(id)).get(id));
  }

  /**
   * Composes already admitted matches using their pool context and one scalar team presentation
   * read. Calendar days retain every selected match; bounded consumers keep their own selection
   * limit.
   *
   * @param inputs current accepted sporting inputs from the same consistent read
   * @param now common presentation instant
   * @return public summaries with current owner-controlled names and independent attribution,
   *     without loading participant or club entities and their retained artwork
   */
  Map<UUID, ConsultationViews.MatchSummary> composeMatchSummaries(
      Collection<MatchInput> inputs, Instant now) {
    Map<UUID, View> teams =
        facts.presentations(
            SportingProjectionChanges.Kind.TEAM,
            inputs.stream()
                .flatMap(input -> Stream.of(input.homeTeamId(), input.awayTeamId()))
                .collect(Collectors.toSet()));
    return inputs.stream()
        .collect(
            Collectors.toUnmodifiableMap(
                MatchInput::id,
                input -> {
                  ConsultationViews.Result result =
                      mapper.toView(input.result(), input.resultObservedAt());
                  ConsultationViews.PoolSummary pool =
                      new ConsultationViews.PoolSummary(
                          mapper.toView(input.pool()),
                          input.season(),
                          mapper.toView(input.classification(), input.division()),
                          null,
                          null);
                  return new ConsultationViews.MatchSummary(
                      input.id(),
                      pool,
                      mapper.toView(Objects.requireNonNull(teams.get(input.homeTeamId()))),
                      mapper.toView(Objects.requireNonNull(teams.get(input.awayTeamId()))),
                      input.schedule(),
                      MatchPresentation.category(input.schedule(), result, now),
                      result);
                }));
  }
}
