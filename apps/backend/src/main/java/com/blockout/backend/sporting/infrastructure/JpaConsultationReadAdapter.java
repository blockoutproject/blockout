package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.mobile.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.SportFormatEnum;
import com.blockout.backend.generated.mobile.model.SportGenderEnum;
import com.blockout.backend.sporting.application.ConsultationReadPort;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.MatchPresentation;
import com.blockout.backend.sporting.application.model.MatchDetails;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import com.blockout.backend.sporting.application.model.SportingPublicInput;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
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

  /** {@inheritDoc} */
  @Override
  public Optional<ConsultationViews.ClubDetail> club(UUID clubId) {
    return owners
        .publicPresentation(Kind.CLUB, clubId)
        .map(
            presentation -> {
              Map<ContactField, String> contacts = owners.publicClubContacts(clubId);
              List<SeasonView> seasons =
                  clubTeamInputs(clubId, null).stream()
                      .map(input -> owners.season(input.seasonId()).orElseThrow())
                      .distinct()
                      .sorted(
                          Comparator.comparingLong(SeasonView::startYear)
                              .reversed()
                              .thenComparing(SeasonView::id))
                      .toList();
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
    List<ConsultationViews.TeamSummary> teams =
        clubTeamInputs(request.clubId(), request.seasonId()).stream()
            .map(input -> teamSummary(input.id()))
            .sorted(
                Comparator.comparing((ConsultationViews.TeamSummary value) -> value.team().name())
                    .thenComparing(value -> value.team().id()))
            .toList();
    return Optional.of(new ConsultationViews.ClubTeams(request.seasonId(), teams));
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ConsultationViews.TeamDetail> team(UUID teamId) {
    return owners.publicInputs(Kind.TEAM, Set.of(teamId)).stream()
        .findFirst()
        .map(
            input ->
                new ConsultationViews.TeamDetail(
                    teamSummary(teamId),
                    input.poolIds().stream()
                        .map(this::poolSummary)
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
    return owners.publicInputs(Kind.POOL, Set.of(poolId)).stream()
        .findFirst()
        .map(input -> new ConsultationViews.PoolDetail(poolSummary(poolId)));
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
              ConsultationViews.Schedule publicSchedule =
                  new ConsultationViews.Schedule(
                      schedule.getLocalDate(),
                      offset(schedule.getReliableStart()),
                      schedule.getTimeZone(),
                      offset(schedule.getScheduleObservedAt()));
              ConsultationViews.Result result =
                  details.result() == null
                      ? null
                      : new ConsultationViews.Result(
                          ResultStateEnum.fromValue(details.result().state().getValue()),
                          details.result().homeSets(),
                          details.result().awaySets(),
                          details.result().specialLabel(),
                          offset(details.resultObservedAt()));
              ConsultationViews.MatchSummary summary =
                  new ConsultationViews.MatchSummary(
                      matchId,
                      poolSummary(match.poolId()),
                      publicIdentity(Kind.TEAM, match.homeTeamId()),
                      publicIdentity(Kind.TEAM, match.awayTeamId()),
                      publicSchedule,
                      MatchPresentation.category(publicSchedule, result, evaluatedAt),
                      result);
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
   * Selects exact club/season identities in SQL, then delegates all current eligibility to F02.
   *
   * @param clubId current organization
   * @param seasonId selected season, or null for all seasons
   * @return effective authorized inputs without a second visibility predicate
   */
  private List<SportingPublicInput> clubTeamInputs(UUID clubId, UUID seasonId) {
    List<UUID> ids =
        entities
            .createQuery(
                "SELECT t.id FROM TeamEntity t WHERE t.club.id = :club AND (:season IS NULL OR t.season.id = :season) ORDER BY t.id",
                UUID.class)
            .setParameter("club", clubId)
            .setParameter("season", seasonId)
            .getResultList();
    List<SportingPublicInput> result = new ArrayList<>();
    // F02 bounds each hydration call, not the complete club response or retained history.
    for (int start = 0; start < ids.size(); start += 200) {
      result.addAll(
          owners.publicInputs(
              Kind.TEAM,
              new LinkedHashSet<>(ids.subList(start, Math.min(start + 200, ids.size())))));
    }
    return List.copyOf(result);
  }

  /**
   * Combines accepted team context and effective presentation without an assumed club.
   *
   * @param id currently visible team
   * @return exact seasonal summary
   */
  private ConsultationViews.TeamSummary teamSummary(UUID id) {
    TeamView team = owners.team(id).orElseThrow();
    return new ConsultationViews.TeamSummary(
        publicIdentity(Kind.TEAM, id),
        owners.season(team.seasonId()).orElseThrow(),
        classification(team.classification()),
        team.clubId() == null ? null : publicIdentity(Kind.CLUB, team.clubId()),
        team.provider() == CollectionProviderEnum.LNV);
  }

  /**
   * Keeps known pool context only; native references are not invented competition/phase names.
   *
   * @param id current visible contextual pool
   * @return independent accepted classification and canonical season
   */
  private ConsultationViews.PoolSummary poolSummary(UUID id) {
    com.blockout.backend.sporting.application.model.SportingViews.PoolView pool =
        owners.pool(id).orElseThrow();
    return new ConsultationViews.PoolSummary(
        publicIdentity(Kind.POOL, id),
        owners.season(pool.key().seasonId()).orElseThrow(),
        classification(pool.classification()),
        null,
        null);
  }

  /**
   * Resolves names and effective logo links exclusively through the F02 presentation owner.
   *
   * @param kind visible club, team or pool
   * @param id exact current identity
   * @return detached identity without editing metadata
   */
  private ConsultationViews.Identity publicIdentity(Kind kind, UUID id) {
    return identity(owners.publicPresentation(kind, id).orElseThrow());
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
    DivisionDetail division = facts.divisionDetail(value.divisionId()).orElseThrow();
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
