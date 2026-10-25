package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.shared.mapping.TemporalMapping;
import com.blockout.backend.sporting.application.ConsultationMatchSelection;
import com.blockout.backend.sporting.application.ConsultationStore;
import com.blockout.backend.sporting.application.ConsultationViewMapper;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.MatchPresentation;
import com.blockout.backend.sporting.application.SportingProjectionChanges;
import com.blockout.backend.sporting.application.model.MatchDetails;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.sporting.application.service.SportingReadService;
import jakarta.persistence.criteria.CommonAbstractCriteria;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** JPA selections mapped inside the application read transaction using current F02 owner values. */
@Repository
@RequiredArgsConstructor
public class JpaConsultationStore implements ConsultationStore, ConsultationMatchSelection {
  private final MatchRepository matches;
  private final SportingReadService owners;
  private final SportingStore facts;
  private final Clock clock;
  private final DivisionRepository divisions;
  private final SportingPersistenceMapper persistenceMapper;
  private final ConsultationViewMapper viewMapper;

  /** {@inheritDoc} */
  @Override
  public Subquery<UUID> visibleIds(CommonAbstractCriteria query, CriteriaBuilder builder) {
    Subquery<UUID> selected = query.subquery(UUID.class);
    Root<MatchEntity> match = selected.from(MatchEntity.class);
    Subquery<UUID> home = selected.subquery(UUID.class);
    Root<ParticipationEntity> h = home.from(ParticipationEntity.class);
    home.select(h.get("id"))
        .where(
            builder.equal(h.get("pool"), match.get("pool")),
            builder.equal(h.get("team"), match.get("homeTeam")),
            builder.isTrue(h.get("current")));
    Subquery<UUID> away = selected.subquery(UUID.class);
    Root<ParticipationEntity> a = away.from(ParticipationEntity.class);
    away.select(a.get("id"))
        .where(
            builder.equal(a.get("pool"), match.get("pool")),
            builder.equal(a.get("team"), match.get("awayTeam")),
            builder.isTrue(a.get("current")));
    selected
        .select(match.get("id"))
        .where(
            builder.isTrue(match.get("present")),
            builder.isNotNull(match.get("localDate")),
            builder.isTrue(match.get("pool").get("catalogEligible")),
            builder.isFalse(match.get("pool").get("calendarEmpty")),
            builder.isTrue(match.get("pool").get("division").get("active")),
            builder.isTrue(match.get("homeTeam").get("division").get("active")),
            builder.isTrue(match.get("awayTeam").get("division").get("active")),
            builder.exists(home),
            builder.exists(away));
    return selected;
  }

  /** {@inheritDoc} */
  @Override
  public Map<UUID, ConsultationViews.MatchSummary> summaries(Set<UUID> ids, Instant now) {
    if (ids.isEmpty()) return Map.of();
    return matches.findPresentationByIdIn(ids).stream()
        .collect(
            Collectors.toUnmodifiableMap(MatchEntity::getId, match -> matchSummary(match, now)));
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ConsultationViews.Identity> clubIdentity(UUID clubId) {
    return owners.publicPresentation(Kind.CLUB, clubId).map(viewMapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ConsultationViews.ClubDetail> club(UUID clubId) {
    return clubIdentity(clubId)
        .map(
            club -> {
              Map<ContactField, String> contacts = owners.publicClubContacts(clubId);
              List<SeasonView> seasons = owners.publicClubSeasons(clubId);
              return new ConsultationViews.ClubDetail(
                  club,
                  viewMapper.toView(contacts),
                  owners
                      .publicLocality(clubId)
                      .filter(value -> value.latitude() != null && value.longitude() != null)
                      .map(viewMapper::toView)
                      .orElse(null),
                  seasons);
            });
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ConsultationViews.ClubTeams> clubTeams(ClubSeasonRequest request) {
    if (owners.publicPresentation(Kind.CLUB, request.clubId()).isEmpty()
        || owners.season(request.seasonId()).isEmpty()) return Optional.empty();
    List<TeamView> selected = owners.publicClubTeams(request.clubId(), request.seasonId());
    Map<UUID, DivisionDetail> divisionDetails =
        selected.isEmpty()
            ? Map.of()
            : divisions
                .findSummariesByIdIn(
                    selected.stream()
                        .map(team -> team.classification().divisionId())
                        .collect(Collectors.toSet()))
                .stream()
                .map(persistenceMapper::toDetail)
                .collect(Collectors.toMap(DivisionDetail::id, value -> value));
    List<ConsultationViews.TeamSummary> teams =
        selected.stream()
            .map(team -> teamSummary(team, divisionDetails.get(team.classification().divisionId())))
            .sorted(
                Comparator.comparing((ConsultationViews.TeamSummary value) -> value.team().name())
                    .thenComparing(value -> value.team().id()))
            .toList();
    return Optional.of(new ConsultationViews.ClubTeams(request.seasonId(), teams));
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ConsultationViews.TeamSummary> teamSummary(UUID teamId) {
    return owners
        .publicPresentation(Kind.TEAM, teamId)
        .map(
            ignored -> {
              TeamView team = owners.team(teamId).orElseThrow();
              return teamSummary(
                  team, facts.divisionDetail(team.classification().divisionId()).orElseThrow());
            });
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ConsultationViews.TeamDetail> team(UUID teamId) {
    return teamSummary(teamId)
        .map(
            summary ->
                new ConsultationViews.TeamDetail(
                    summary,
                    owners.publicTeamPoolIds(teamId).stream()
                        .map(id -> poolSummary(id).orElseThrow())
                        .sorted(
                            Comparator.comparingLong(
                                    (ConsultationViews.PoolSummary value) ->
                                        value.season().startYear())
                                .reversed()
                                .thenComparing(
                                    ConsultationViews.PoolSummary::competitionName,
                                    Comparator.nullsLast(Comparator.naturalOrder()))
                                .thenComparing(value -> value.pool().name())
                                .thenComparing(value -> value.pool().id().toString()))
                        .toList()));
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ConsultationViews.PoolDetail> pool(UUID poolId) {
    return poolSummary(poolId).map(ConsultationViews.PoolDetail::new);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ConsultationViews.MatchDetail> match(UUID matchId) {
    Instant evaluatedAt = clock.instant();
    return owners
        .publicMatch(matchId)
        .map(
            match -> {
              MatchEntity schedule = matches.findById(matchId).orElseThrow();
              MatchDetails details = facts.matchDetails(matchId);
              ConsultationViews.MatchSummary summary = matchSummary(schedule, evaluatedAt);
              return new ConsultationViews.MatchDetail(
                  summary,
                  details.sets() == null
                      ? null
                      : new ConsultationViews.Sets(
                          TemporalMapping.toDate(details.setsObservedAt()), details.sets()),
                  details.venueName(),
                  details.venueAddress(),
                  details.referees(),
                  null,
                  null,
                  List.of());
            });
  }

  /**
   * Composes an already admitted match using owner presentation in the current transaction. Batched
   * callers fetch its to-one graph first; no collections or additional eligibility reads are needed
   * for this public summary.
   *
   * @param match currently admitted dated match
   * @param now common presentation evaluation instant
   * @return the same current summary used by ordinary match consultation
   */
  private ConsultationViews.MatchSummary matchSummary(MatchEntity match, Instant now) {
    PoolEntity pool = match.getPool();
    ConsultationViews.Schedule schedule =
        new ConsultationViews.Schedule(
            match.getLocalDate(),
            TemporalMapping.toDate(match.getReliableStart()),
            match.getTimeZone(),
            TemporalMapping.toDate(match.getScheduleObservedAt()));
    MatchObservation.Result accepted = persistenceMapper.toResult(match);
    ConsultationViews.Result result = viewMapper.toView(accepted, match.getResultObservedAt());
    ConsultationViews.PoolSummary context =
        new ConsultationViews.PoolSummary(
            viewMapper.toView(
                facts
                    .presentation(SportingProjectionChanges.Kind.POOL, pool.getId())
                    .orElseThrow()),
            persistenceMapper.toView(pool.getSeason()),
            viewMapper.toView(
                new SportingClassification(
                    pool.getDivision().getId(), pool.getFormat(), pool.getGender()),
                persistenceMapper.toDetail(pool.getDivision())),
            null,
            null);
    return new ConsultationViews.MatchSummary(
        match.getId(),
        context,
        viewMapper.toView(
            facts
                .presentation(SportingProjectionChanges.Kind.TEAM, match.getHomeTeam().getId())
                .orElseThrow()),
        viewMapper.toView(
            facts
                .presentation(SportingProjectionChanges.Kind.TEAM, match.getAwayTeam().getId())
                .orElseThrow()),
        schedule,
        MatchPresentation.category(schedule, result, now),
        result);
  }

  /**
   * Combines accepted team context and effective presentation without an assumed club.
   *
   * <p>F02 has already established eligibility; reuse its fetched owner values in the same
   * transaction.
   *
   * @param team current eligible team from F02 within this read transaction
   * @param division selected owner metadata, with image bytes excluded
   * @return exact seasonal summary
   */
  private ConsultationViews.TeamSummary teamSummary(TeamView team, DivisionDetail division) {
    return new ConsultationViews.TeamSummary(
        viewMapper.toView(
            facts.presentation(SportingProjectionChanges.Kind.TEAM, team.id()).orElseThrow()),
        owners.season(team.seasonId()).orElseThrow(),
        viewMapper.toView(team.classification(), division),
        team.clubId() == null
            ? null
            : viewMapper.toView(
                facts
                    .presentation(SportingProjectionChanges.Kind.CLUB, team.clubId())
                    .orElseThrow()),
        team.provider() == CollectionProviderEnum.LNV);
  }

  /**
   * Keeps known pool context only; native references are not invented competition/phase names.
   *
   * @param id current visible contextual pool
   * @return independent accepted classification and canonical season, or empty when unavailable
   */
  private Optional<ConsultationViews.PoolSummary> poolSummary(UUID id) {
    return owners
        .publicPresentation(Kind.POOL, id)
        .map(
            presentation -> {
              com.blockout.backend.sporting.application.model.SportingViews.PoolView pool =
                  owners.pool(id).orElseThrow();
              return new ConsultationViews.PoolSummary(
                  viewMapper.toView(presentation),
                  owners.season(pool.key().seasonId()).orElseThrow(),
                  classification(pool.classification()),
                  null,
                  null);
            });
  }

  /**
   * Projects only an explicitly accepted classification and current division presentation.
   *
   * @param value accepted classification, or null when unknown
   * @return public classification without inferred defaults
   */
  private ConsultationViews.Classification classification(SportingClassification value) {
    if (value == null) return new ConsultationViews.Classification(null, null, null);
    return viewMapper.toView(value, facts.divisionDetail(value.divisionId()).orElseThrow());
  }
}
