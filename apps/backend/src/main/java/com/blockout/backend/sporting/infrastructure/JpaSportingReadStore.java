package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.sporting.application.SportingProjectionChanges;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Scope;
import com.blockout.backend.sporting.application.model.SportingPublicInput;
import com.blockout.backend.sporting.application.model.SportingPublicInput.Alias;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.model.SportingVisibility.Reason;
import com.blockout.backend.sporting.application.port.SportingReadStore;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

/** Canonical JPA reads; search engines and retained follows never authorize public hydration. */
@Repository
@RequiredArgsConstructor
public class JpaSportingReadStore implements SportingReadStore {
  private final ClubRepository clubs;
  private final PoolRepository pools;
  private final TeamRepository teams;
  private final MatchRepository matches;
  private final DivisionRepository divisions;
  private final ParticipationRepository participations;
  private final SportingPersistenceMapper mapper;

  /** {@inheritDoc} */
  @Override
  public Optional<SportingVisibility> visibility(Kind kind, UUID id) {
    Set<Reason> reasons = EnumSet.noneOf(Reason.class);
    switch (kind) {
      case CLUB -> {
        if (!clubs.existsById(id)) return Optional.empty();
      }
      case POOL -> {
        PoolVisibilityRow pool = pools.findVisibility(id).orElse(null);
        if (pool == null) return Optional.empty();
        reasons.addAll(
            poolReasons(
                pool.catalogEligible(),
                pool.calendarEmpty(),
                pool.divisionId(),
                pool.divisionActive()));
      }
      case TEAM -> {
        Boolean active = teams.findDivisionActivity(id).orElse(null);
        if (active == null) return Optional.empty();
        if (!active) reasons.add(Reason.DIVISION_INACTIVE);
        if (visiblePoolIds(Set.of(id)).isEmpty()) reasons.add(Reason.NO_VISIBLE_PARTICIPATION);
      }
      case MATCH -> {
        MatchVisibilityRow match = matches.findVisibility(id).orElse(null);
        if (match == null) return Optional.empty();
        reasons.addAll(
            poolReasons(
                match.catalogEligible(),
                match.calendarEmpty(),
                match.divisionId(),
                match.divisionActive()));
        if (!match.present()) reasons.add(Reason.ITEM_ABSENT);
        if (match.localDate() == null) reasons.add(Reason.DATE_UNKNOWN);
        Map<UUID, List<UUID>> memberships =
            visiblePoolIds(Set.of(match.homeTeamId(), match.awayTeamId()));
        if (!memberships.getOrDefault(match.homeTeamId(), List.of()).contains(match.poolId())
            || !memberships.getOrDefault(match.awayTeamId(), List.of()).contains(match.poolId()))
          reasons.add(Reason.NO_VISIBLE_PARTICIPATION);
      }
    }
    return Optional.of(new SportingVisibility(id, kind, reasons));
  }

  /**
   * Computes independent pool restrictions from scalar facts without loading division images.
   * Season closure never hides retained sporting data.
   *
   * @param catalogEligible current catalog presence
   * @param calendarEmpty whether the last qualified current calendar was empty
   * @param divisionId accepted classification, or null before classification
   * @param divisionActive current division activity, or null without a classification
   * @return every current catalog, calendar and division restriction
   */
  private Set<Reason> poolReasons(
      boolean catalogEligible, boolean calendarEmpty, UUID divisionId, Boolean divisionActive) {
    Set<Reason> reasons = EnumSet.noneOf(Reason.class);
    if (!catalogEligible) reasons.add(Reason.CATALOG_ABSENT);
    if (calendarEmpty) reasons.add(Reason.CALENDAR_EMPTY);
    if (divisionId == null) reasons.add(Reason.UNCLASSIFIED);
    else if (!divisionActive) reasons.add(Reason.DIVISION_INACTIVE);
    return reasons;
  }

  /** {@inheritDoc} */
  @Override
  public List<SeasonView> viewableSeasons(Kind kind) {
    List<SeasonEntity> seasons =
        switch (kind) {
          case TEAM -> teams.findVisibleSeasons();
          case POOL -> pools.findVisibleSeasons();
          default ->
              throw new IllegalArgumentException("Sporting choices require a team or pool kind");
        };
    return seasons.stream().map(mapper::toView).toList();
  }

  /** {@inheritDoc} */
  @Override
  public Set<UUID> viewablePoolTeamIds(UUID poolId) {
    return Set.copyOf(participations.findVisibleTeamIds(poolId));
  }

  /** {@inheritDoc} */
  @Override
  public List<SeasonView> viewableClubSeasons(UUID clubId) {
    return teams.findVisibleClubSeasons(clubId).stream().map(mapper::toView).toList();
  }

  /** {@inheritDoc} Scalar projection avoids loading parent or team image payloads. */
  @Override
  public List<TeamView> viewableClubTeams(UUID clubId, UUID seasonId) {
    return teams.findVisibleClubTeams(clubId, seasonId);
  }

  /** {@inheritDoc} */
  @Override
  public List<UUID> viewableTeamPoolIds(UUID teamId) {
    return List.copyOf(visiblePoolIds(Set.of(teamId)).getOrDefault(teamId, List.of()));
  }

  /** {@inheritDoc} */
  @Override
  public List<SportingPublicInput> projectionInputs(Kind kind, int page, int size) {
    PageRequest request = PageRequest.of(page, size);
    List<UUID> ids =
        switch (kind) {
          case CLUB -> clubs.findProjectionIds(request);
          case TEAM -> teams.findProjectionIds(request);
          case POOL -> pools.findProjectionIds(request);
          case MATCH -> throw new IllegalArgumentException("Matches have no search projection");
        };
    return publicInputs(kind, new LinkedHashSet<>(ids));
  }

  /** {@inheritDoc} */
  @Override
  public List<SportingPublicInput> publicInputs(Kind kind, Set<UUID> ids) {
    if (ids.isEmpty()) return List.of();
    List<SportingSearchRow> rows =
        switch (kind) {
          case CLUB -> clubs.findSearchInputs(ids);
          case POOL -> pools.findSearchInputs(ids);
          case TEAM -> teams.findSearchInputs(ids);
          case MATCH -> throw new IllegalArgumentException("Matches have no search projection");
        };
    Map<UUID, Set<Alias>> aliases = aliases(kind, ids);
    Map<UUID, Set<String>> terms = divisionTerms(rows);
    Map<UUID, List<UUID>> memberships = kind == Kind.TEAM ? visiblePoolIds(ids) : Map.of();
    return rows.stream()
        .map(
            row ->
                mapper.toPublicInput(
                    row,
                    kind,
                    aliases.getOrDefault(row.id(), Set.of()),
                    terms.getOrDefault(row.divisionId(), Set.of()),
                    memberships.getOrDefault(row.id(), List.of())))
        .toList();
  }

  /**
   * Loads terms once per selected division without selecting binary division presentation.
   *
   * @param rows current scalar search inputs
   * @return current term sets grouped by their owner
   */
  private Map<UUID, Set<String>> divisionTerms(List<SportingSearchRow> rows) {
    Set<UUID> ids = new HashSet<>();
    for (SportingSearchRow row : rows) if (row.divisionId() != null) ids.add(row.divisionId());
    Map<UUID, Set<String>> result = new HashMap<>();
    if (!ids.isEmpty())
      for (DivisionTermRow row : divisions.findTerms(ids))
        result.computeIfAbsent(row.divisionId(), ignored -> new HashSet<>()).add(row.term());
    return result;
  }

  /**
   * Batch-loads qualified aliases without initializing one lazy collection per root.
   *
   * @param kind indexable owner kind
   * @param ids bounded owner identities
   * @return immutable alias values grouped by exact owner
   */
  private Map<UUID, Set<Alias>> aliases(Kind kind, Set<UUID> ids) {
    List<SportingAliasRow> rows =
        switch (kind) {
          case CLUB -> clubs.findAliases(ids);
          case TEAM -> teams.findAliases(ids);
          case POOL -> pools.findAliases(ids);
          case MATCH -> throw new IllegalArgumentException("Matches have no search projection");
        };
    Map<UUID, Set<Alias>> result = new HashMap<>();
    for (SportingAliasRow row : rows)
      result.computeIfAbsent(row.ownerId(), ignored -> new HashSet<>()).add(mapper.toView(row));
    return result;
  }

  /**
   * Batch-resolves current memberships through visible pools, retaining no copied visibility flag.
   *
   * @param teamIds known or candidate team identities
   * @return eligible pool IDs grouped by team in stable pool order
   */
  private Map<UUID, List<UUID>> visiblePoolIds(Set<UUID> teamIds) {
    Map<UUID, List<UUID>> result = new HashMap<>();
    for (TeamPoolRow row : participations.findVisibleMemberships(teamIds))
      result.computeIfAbsent(row.teamId(), ignored -> new ArrayList<>()).add(row.poolId());
    return result;
  }

  /** {@inheritDoc} */
  @Override
  public Set<Scope> projectionDependents(Set<Scope> scopes) {
    Set<Scope> result = new HashSet<>();
    for (Scope scope : scopes) {
      if (scope.kind() == SportingProjectionChanges.Kind.CLUB
          || scope.kind() == SportingProjectionChanges.Kind.TEAM
          || scope.kind() == SportingProjectionChanges.Kind.POOL) result.add(scope);
    }
    Set<UUID> clubIds = scopeIds(scopes, SportingProjectionChanges.Kind.CLUB);
    Set<UUID> teams = scopeIds(scopes, SportingProjectionChanges.Kind.TEAM);
    Set<UUID> pools = scopeIds(scopes, SportingProjectionChanges.Kind.POOL);
    Set<UUID> divisionIds = scopeIds(scopes, SportingProjectionChanges.Kind.DIVISION);
    Set<UUID> seasons = scopeIds(scopes, SportingProjectionChanges.Kind.SEASON);
    if (!divisionIds.isEmpty() || !seasons.isEmpty()) {
      pools.addAll(this.pools.findProjectionDependents(divisionIds, seasons));
      teams.addAll(this.teams.findProjectionDependents(divisionIds, seasons));
    }
    if (!clubIds.isEmpty()) teams.addAll(this.teams.findIdsByClubIds(clubIds));
    if (!pools.isEmpty()) teams.addAll(participations.findTeamIdsByPoolIds(pools));
    if (!teams.isEmpty()) pools.addAll(participations.findPoolIdsByTeamIds(teams));
    teams.forEach(id -> result.add(new Scope(SportingProjectionChanges.Kind.TEAM, id)));
    pools.forEach(id -> result.add(new Scope(SportingProjectionChanges.Kind.POOL, id)));
    return Set.copyOf(result);
  }

  /**
   * Collects a scope kind once for batched dependent queries.
   *
   * @param scopes changed identities/scopes
   * @param kind requested owner kind
   * @return mutable ID set extended only inside this read operation
   */
  private Set<UUID> scopeIds(Set<Scope> scopes, SportingProjectionChanges.Kind kind) {
    Set<UUID> ids = new HashSet<>();
    for (Scope scope : scopes) if (scope.kind() == kind) ids.add(scope.id());
    return ids;
  }
}
