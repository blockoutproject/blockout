package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.sporting.application.SportingProjectionChanges;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Scope;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingPublicInput;
import com.blockout.backend.sporting.application.model.SportingPublicInput.Alias;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.model.SportingVisibility.Reason;
import com.blockout.backend.sporting.application.port.SportingReadStore;
import jakarta.persistence.EntityManager;
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
import org.springframework.stereotype.Repository;

/** Canonical JPA reads; search engines and retained follows never authorize public hydration. */
@Repository
@RequiredArgsConstructor
public class JpaSportingReadStore implements SportingReadStore {
  private static final String POOL_VISIBLE =
      "p.catalogEligible = TRUE AND p.calendarEmpty = FALSE AND p.division.active = TRUE";
  private static final String TEAM_VISIBLE =
      "t.division.active = TRUE AND EXISTS (SELECT r.id FROM ParticipationEntity r JOIN r.pool p WHERE r.team = t AND r.current = TRUE AND "
          + POOL_VISIBLE
          + ")";
  private final EntityManager entities;

  /** {@inheritDoc} */
  @Override
  public Optional<SportingVisibility> visibility(Kind kind, UUID id) {
    Set<Reason> reasons = EnumSet.noneOf(Reason.class);
    switch (kind) {
      case CLUB -> {
        if (entities.find(ClubEntity.class, id) == null) return Optional.empty();
      }
      case POOL -> {
        PoolEntity pool = entities.find(PoolEntity.class, id);
        if (pool == null) return Optional.empty();
        reasons.addAll(poolReasons(pool));
      }
      case TEAM -> {
        TeamEntity team = entities.find(TeamEntity.class, id);
        if (team == null) return Optional.empty();
        if (!team.getDivision().isActive()) reasons.add(Reason.DIVISION_INACTIVE);
        if (visiblePoolIds(Set.of(id)).isEmpty()) reasons.add(Reason.NO_VISIBLE_PARTICIPATION);
      }
      case MATCH -> {
        MatchEntity match = entities.find(MatchEntity.class, id);
        if (match == null) return Optional.empty();
        reasons.addAll(poolReasons(match.getPool()));
        if (!match.isPresent()) reasons.add(Reason.ITEM_ABSENT);
        if (match.getLocalDate() == null) reasons.add(Reason.DATE_UNKNOWN);
        Map<UUID, List<UUID>> memberships =
            visiblePoolIds(Set.of(match.getHomeTeam().getId(), match.getAwayTeam().getId()));
        if (!memberships
                .getOrDefault(match.getHomeTeam().getId(), List.of())
                .contains(match.getPool().getId())
            || !memberships
                .getOrDefault(match.getAwayTeam().getId(), List.of())
                .contains(match.getPool().getId())) reasons.add(Reason.NO_VISIBLE_PARTICIPATION);
      }
    }
    return Optional.of(new SportingVisibility(id, kind, reasons));
  }

  /**
   * Computes independent pool restrictions without treating season closure as hiding.
   *
   * @param pool current retained pool
   * @return every current catalog, calendar and division restriction
   */
  private Set<Reason> poolReasons(PoolEntity pool) {
    Set<Reason> reasons = EnumSet.noneOf(Reason.class);
    if (!pool.isCatalogEligible()) reasons.add(Reason.CATALOG_ABSENT);
    if (pool.isCalendarEmpty()) reasons.add(Reason.CALENDAR_EMPTY);
    if (pool.getDivision() == null) reasons.add(Reason.UNCLASSIFIED);
    else if (!pool.getDivision().isActive()) reasons.add(Reason.DIVISION_INACTIVE);
    return reasons;
  }

  /** {@inheritDoc} */
  @Override
  public List<SportingPublicInput> projectionInputs(Kind kind, int page, int size) {
    List<UUID> ids =
        entities
            .createQuery(selection(kind), UUID.class)
            .setFirstResult(Math.multiplyExact(page, size))
            .setMaxResults(size)
            .getResultList();
    return publicInputs(kind, new LinkedHashSet<>(ids));
  }

  /**
   * Keeps filtering and UUID ordering in the database before bounded hydration.
   *
   * @param kind indexable resource kind
   * @return JPQL selecting only current eligible root IDs
   */
  private String selection(Kind kind) {
    return switch (kind) {
      case CLUB -> "SELECT c.id FROM ClubEntity c WHERE TRUE = TRUE ORDER BY c.id";
      case TEAM -> "SELECT t.id FROM TeamEntity t WHERE " + TEAM_VISIBLE + " ORDER BY t.id";
      case POOL -> "SELECT p.id FROM PoolEntity p WHERE " + POOL_VISIBLE + " ORDER BY p.id";
      case MATCH -> throw new IllegalArgumentException("Matches have no search projection");
    };
  }

  /** {@inheritDoc} */
  @Override
  public List<SportingPublicInput> publicInputs(Kind kind, Set<UUID> ids) {
    if (ids.isEmpty()) return List.of();
    String query =
        switch (kind) {
          case CLUB ->
              """
          SELECT NEW com.blockout.backend.sporting.infrastructure.SportingSearchRow(
            c.id, NULL, c.sourceName, NULL, NULL, NULL, NULL, NULL, NULL,
            CASE WHEN c.municipalityRestricted = TRUE THEN NULL ELSE c.municipality END)
          FROM ClubEntity c WHERE c.id IN :ids ORDER BY c.id
          """;
          case POOL ->
              """
          SELECT NEW com.blockout.backend.sporting.infrastructure.SportingSearchRow(
            p.id, p.season.id, p.sourceName, p.division.id, p.division.name, p.format, p.gender,
            NULL, NULL, NULL)
          FROM PoolEntity p WHERE p.id IN :ids AND
          """
                  + POOL_VISIBLE
                  + " ORDER BY p.id";
          case TEAM ->
              """
          SELECT NEW com.blockout.backend.sporting.infrastructure.SportingSearchRow(
            t.id, t.season.id, t.sourceName, t.division.id, t.division.name, t.format, t.gender,
            c.id, c.sourceName,
            CASE WHEN c.municipalityRestricted = TRUE THEN NULL ELSE c.municipality END)
          FROM TeamEntity t LEFT JOIN t.club c WHERE t.id IN :ids AND
          """
                  + TEAM_VISIBLE
                  + " ORDER BY t.id";
          case MATCH -> throw new IllegalArgumentException("Matches have no search projection");
        };
    List<SportingSearchRow> rows =
        entities
            .createQuery(query, SportingSearchRow.class)
            .setParameter("ids", ids)
            .getResultList();
    Map<UUID, Set<Alias>> aliases = aliases(kind, ids);
    Map<UUID, Set<String>> terms = divisionTerms(rows);
    Map<UUID, List<UUID>> memberships = kind == Kind.TEAM ? visiblePoolIds(ids) : Map.of();
    return rows.stream()
        .map(
            row ->
                new SportingPublicInput(
                    row.id(),
                    kind,
                    row.seasonId(),
                    row.sourceName(),
                    row.sourceName(),
                    aliases.getOrDefault(row.id(), Set.of()),
                    row.divisionId() == null
                        ? null
                        : new SportingClassification(row.divisionId(), row.format(), row.gender()),
                    row.divisionName(),
                    terms.getOrDefault(row.divisionId(), Set.of()),
                    row.clubId(),
                    row.clubName(),
                    row.city(),
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
      for (Object[] row :
          entities
              .createQuery(
                  "SELECT d.id, term FROM DivisionEntity d JOIN d.searchTerms term WHERE d.id IN :ids",
                  Object[].class)
              .setParameter("ids", ids)
              .getResultList())
        result.computeIfAbsent((UUID) row[0], ignored -> new HashSet<>()).add((String) row[1]);
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
    String owner =
        switch (kind) {
          case CLUB -> "ClubEntity";
          case TEAM -> "TeamEntity";
          case POOL -> "PoolEntity";
          case MATCH -> throw new IllegalArgumentException("Matches have no search projection");
        };
    Map<UUID, Set<Alias>> result = new HashMap<>();
    for (Object[] row :
        entities
            .createQuery(
                "SELECT o.id, a.seasonId, a.organizerReference, a.competitionReference, a.comparisonName FROM "
                    + owner
                    + " o JOIN o.aliases a WHERE o.id IN :ids",
                Object[].class)
            .setParameter("ids", ids)
            .getResultList()) {
      result
          .computeIfAbsent((UUID) row[0], ignored -> new HashSet<>())
          .add(new Alias((UUID) row[1], (String) row[2], (String) row[3], (String) row[4]));
    }
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
    for (Object[] row :
        entities
            .createQuery(
                "SELECT r.team.id, p.id FROM ParticipationEntity r JOIN r.pool p WHERE r.team.id IN :ids AND r.current = TRUE AND r.team.division.active = TRUE AND "
                    + POOL_VISIBLE
                    + " ORDER BY p.id",
                Object[].class)
            .setParameter("ids", teamIds)
            .getResultList())
      result.computeIfAbsent((UUID) row[0], ignored -> new ArrayList<>()).add((UUID) row[1]);
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
    Set<UUID> clubs = scopeIds(scopes, SportingProjectionChanges.Kind.CLUB);
    Set<UUID> teams = scopeIds(scopes, SportingProjectionChanges.Kind.TEAM);
    Set<UUID> pools = scopeIds(scopes, SportingProjectionChanges.Kind.POOL);
    Set<UUID> divisions = scopeIds(scopes, SportingProjectionChanges.Kind.DIVISION);
    Set<UUID> seasons = scopeIds(scopes, SportingProjectionChanges.Kind.SEASON);
    if (!divisions.isEmpty() || !seasons.isEmpty()) {
      pools.addAll(
          entities
              .createQuery(
                  "SELECT p.id FROM PoolEntity p WHERE p.division.id IN :divisions OR p.season.id IN :seasons",
                  UUID.class)
              .setParameter("divisions", divisions)
              .setParameter("seasons", seasons)
              .getResultList());
      teams.addAll(
          entities
              .createQuery(
                  "SELECT t.id FROM TeamEntity t WHERE t.division.id IN :divisions OR t.season.id IN :seasons",
                  UUID.class)
              .setParameter("divisions", divisions)
              .setParameter("seasons", seasons)
              .getResultList());
    }
    if (!clubs.isEmpty())
      teams.addAll(
          entities
              .createQuery("SELECT t.id FROM TeamEntity t WHERE t.club.id IN :clubs", UUID.class)
              .setParameter("clubs", clubs)
              .getResultList());
    if (!pools.isEmpty())
      teams.addAll(
          entities
              .createQuery(
                  "SELECT DISTINCT r.team.id FROM ParticipationEntity r WHERE r.pool.id IN :pools",
                  UUID.class)
              .setParameter("pools", pools)
              .getResultList());
    if (!teams.isEmpty())
      pools.addAll(
          entities
              .createQuery(
                  "SELECT DISTINCT r.pool.id FROM ParticipationEntity r WHERE r.team.id IN :teams",
                  UUID.class)
              .setParameter("teams", teams)
              .getResultList());
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
