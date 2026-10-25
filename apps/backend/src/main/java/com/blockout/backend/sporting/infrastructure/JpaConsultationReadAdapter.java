package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.mobile.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.SportFormatEnum;
import com.blockout.backend.generated.mobile.model.SportGenderEnum;
import com.blockout.backend.sporting.application.ConsultationReadPort;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.MatchPresentation;
import com.blockout.backend.sporting.application.SportingProjectionChanges;
import com.blockout.backend.sporting.application.model.MatchDetails;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.sporting.application.service.SportingReadService;
import jakarta.persistence.EntityManager;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** JPA selections mapped inside the application read transaction using current F02 owner values. */
@Repository
@RequiredArgsConstructor
public class JpaConsultationReadAdapter implements ConsultationReadPort {
  private final EntityManager entities;
  private final SportingReadService owners;
  private final SportingStore facts;
  private final Clock clock;
  private final DivisionRepository divisions;
  private final SportingIdentityMapper persistenceMapper;

  /** {@inheritDoc} */
  @Override
  public Optional<ConsultationViews.ClubDetail> club(UUID clubId) {
    return owners
        .publicPresentation(Kind.CLUB, clubId)
        .map(
            presentation -> {
              Map<ContactField, String> contacts = owners.publicClubContacts(clubId);
              List<SeasonView> seasons = owners.publicClubSeasons(clubId);
              return new ConsultationViews.ClubDetail(
                  identity(presentation),
                  new ConsultationViews.Contacts(
                      contacts.get(ContactField.ADDRESS),
                      contacts.get(ContactField.CITY),
                      contacts.get(ContactField.POSTAL_CODE),
                      contacts.get(ContactField.EMAIL),
                      contacts.get(ContactField.PHONE),
                      uri(contacts.get(ContactField.WEBSITE))),
                  owners
                      .publicLocality(clubId)
                      .filter(value -> value.latitude() != null && value.longitude() != null)
                      .map(
                          value ->
                              new ConsultationViews.Location(
                                  value.latitude(), value.longitude(), value.city()))
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
  public Optional<ConsultationViews.TeamDetail> team(UUID teamId) {
    return owners
        .publicPresentation(Kind.TEAM, teamId)
        .map(
            ignored -> {
              TeamView team = owners.team(teamId).orElseThrow();
              return new ConsultationViews.TeamDetail(
                  teamSummary(
                      team, facts.divisionDetail(team.classification().divisionId()).orElseThrow()),
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
                      .toList());
            });
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
              MatchEntity schedule = entities.find(MatchEntity.class, matchId);
              MatchDetails details = facts.matchDetails(matchId);
              ConsultationViews.MatchSummary summary = matchSummary(schedule, evaluatedAt);
              return new ConsultationViews.MatchDetail(
                  summary,
                  details.sets() == null
                      ? null
                      : new ConsultationViews.Sets(
                          offset(details.setsObservedAt()), details.sets()),
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
  ConsultationViews.MatchSummary matchSummary(MatchEntity match, Instant now) {
    PoolEntity pool = match.getPool();
    ConsultationViews.Schedule schedule =
        new ConsultationViews.Schedule(
            match.getLocalDate(),
            offset(match.getReliableStart()),
            match.getTimeZone(),
            offset(match.getScheduleObservedAt()));
    MatchObservation.Result accepted = persistenceMapper.toResult(match);
    ConsultationViews.Result result =
        accepted == null
            ? null
            : new ConsultationViews.Result(
                ResultStateEnum.fromValue(accepted.state().getValue()),
                accepted.homeSets(),
                accepted.awaySets(),
                accepted.specialLabel(),
                offset(match.getResultObservedAt()));
    ConsultationViews.PoolSummary context =
        new ConsultationViews.PoolSummary(
            identity(
                facts
                    .presentation(SportingProjectionChanges.Kind.POOL, pool.getId())
                    .orElseThrow()),
            persistenceMapper.toView(pool.getSeason()),
            classification(
                new SportingClassification(
                    pool.getDivision().getId(), pool.getFormat(), pool.getGender()),
                persistenceMapper.toDetail(pool.getDivision())),
            null,
            null);
    return new ConsultationViews.MatchSummary(
        match.getId(),
        context,
        identity(
            facts
                .presentation(SportingProjectionChanges.Kind.TEAM, match.getHomeTeam().getId())
                .orElseThrow()),
        identity(
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
        identity(facts.presentation(SportingProjectionChanges.Kind.TEAM, team.id()).orElseThrow()),
        owners.season(team.seasonId()).orElseThrow(),
        classification(team.classification(), division),
        team.clubId() == null
            ? null
            : identity(
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
                  identity(presentation),
                  owners.season(pool.key().seasonId()).orElseThrow(),
                  classification(pool.classification()),
                  null,
                  null);
            });
  }

  /**
   * Removes private source/manual state from an already admitted presentation.
   *
   * @param view current effective owner presentation
   * @return permitted identity and backend image resource
   */
  private ConsultationViews.Identity identity(SportingPresentation.View view) {
    return new ConsultationViews.Identity(
        view.id(),
        view.names().effectiveName(),
        view.names().effectiveShortName(),
        view.logo() == null ? null : view.logo().effectiveUrl());
  }

  /**
   * Projects only an explicitly accepted classification and current division presentation.
   *
   * @param value accepted classification, or null when unknown
   * @return public classification without inferred defaults
   */
  private ConsultationViews.Classification classification(SportingClassification value) {
    if (value == null) return new ConsultationViews.Classification(null, null, null);
    return classification(value, facts.divisionDetail(value.divisionId()).orElseThrow());
  }

  /**
   * Combines accepted classification with already selected F02 division metadata.
   *
   * @param value accepted sporting classification
   * @param division current owner presentation from the same read transaction
   * @return public classification without an additional persistence lookup
   */
  private ConsultationViews.Classification classification(
      SportingClassification value, DivisionDetail division) {
    return new ConsultationViews.Classification(
        new ConsultationViews.Division(
            division.id(),
            division.name(),
            division.hasLogo() ? "/divisions/" + division.id() + "/logo" : null,
            division.color(),
            division.gradient()),
        SportFormatEnum.fromValue(value.format().getValue()),
        SportGenderEnum.fromValue(value.gender().getValue()));
  }

  /**
   * Converts a permitted known URI without introducing source fallback.
   *
   * @param value current effective URI text, or null
   * @return the same URI or absence
   */
  private URI uri(String value) {
    return value == null ? null : URI.create(value);
  }

  /**
   * Preserves an accepted instant and independent freshness without inventing a time.
   *
   * @param value current accepted instant, or null
   * @return equivalent UTC offset time, or null
   */
  private OffsetDateTime offset(Instant value) {
    return value == null ? null : value.atOffset(ZoneOffset.UTC);
  }
}
