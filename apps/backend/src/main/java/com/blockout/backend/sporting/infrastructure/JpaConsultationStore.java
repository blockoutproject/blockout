package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.sporting.application.ConsultationMatchSelection;
import com.blockout.backend.sporting.application.ConsultationRequest.CalendarRequest;
import com.blockout.backend.sporting.application.ConsultationStore;
import com.blockout.backend.sporting.application.MatchPresentation;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CommonAbstractCriteria;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Fetch;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * Native JPA selection and detached inputs; public composition belongs to the application reader.
 */
@Repository
@RequiredArgsConstructor
public class JpaConsultationStore implements ConsultationStore, ConsultationMatchSelection {
  private final MatchRepository matches;
  private final DivisionRepository divisions;
  private final TeamRepository teams;
  private final PoolRepository pools;
  private final SeasonRepository seasons;
  private final SportingPersistenceMapper mapper;
  private final EntityManager entityManager;

  /** {@inheritDoc} */
  @Override
  public List<LocalDate> calendarDays(CalendarRequest request, Instant now) {
    CriteriaBuilder builder = entityManager.getCriteriaBuilder();
    CriteriaQuery<LocalDate> query = builder.createQuery(LocalDate.class);
    Root<MatchEntity> match = query.from(MatchEntity.class);
    Expression<LocalDate> day = displayDay(builder, match, request);
    query
        .select(day)
        .distinct(true)
        .where(calendarScope(query, builder, match, day, request, now))
        .orderBy(
            request.category() == CalendarCategoryEnum.UPCOMING
                ? builder.asc(day)
                : builder.desc(day));
    return entityManager.createQuery(query).setMaxResults(8).getResultList();
  }

  /** {@inheritDoc} */
  @Override
  public List<CalendarEntry> calendarMatches(
      CalendarRequest request, List<LocalDate> days, Instant now) {
    if (days.isEmpty()) return List.of();
    CriteriaBuilder builder = entityManager.getCriteriaBuilder();
    CriteriaQuery<Tuple> query = builder.createTupleQuery();
    Root<MatchEntity> match = query.from(MatchEntity.class);
    Fetch<MatchEntity, PoolEntity> pool = match.fetch("pool");
    pool.fetch("season");
    pool.fetch("division");
    for (String participant : List.of("homeTeam", "awayTeam")) {
      Fetch<MatchEntity, TeamEntity> team = match.fetch(participant);
      team.fetch("season");
      team.fetch("division");
      team.fetch("club", JoinType.LEFT);
    }
    Expression<LocalDate> day = displayDay(builder, match, request);
    boolean upcoming = request.category() == CalendarCategoryEnum.UPCOMING;
    query
        .multiselect(day, match)
        .where(builder.and(calendarScope(query, builder, match, day, request, now), day.in(days)))
        .orderBy(
            upcoming ? builder.asc(day) : builder.desc(day),
            builder.asc(match.get("pool").get("id")),
            builder.asc(
                builder
                    .<Integer>selectCase()
                    .when(builder.isNull(match.get("reliableStart")), 1)
                    .otherwise(0)),
            upcoming
                ? builder.asc(match.get("reliableStart"))
                : builder.desc(match.get("reliableStart")),
            builder.asc(match.get("id")));
    return entityManager.createQuery(query).getResultList().stream()
        .map(
            row ->
                new CalendarEntry(
                    row.get(0, LocalDate.class),
                    mapper.toMatchInput(row.get(1, MatchEntity.class))))
        .toList();
  }

  /**
   * Converts reliable instants in PostgreSQL; a date alone remains an unchanged sporting date.
   *
   * @param builder native criteria builder
   * @param match accepted source fields
   * @param request captured IANA grouping zone
   * @return typed display-day expression shared by both calendar queries
   */
  private Expression<LocalDate> displayDay(
      CriteriaBuilder builder, Root<MatchEntity> match, CalendarRequest request) {
    return builder
        .<LocalDate>selectCase()
        .when(builder.isNull(match.get("reliableStart")), match.get("localDate"))
        .otherwise(
            builder.function(
                "date",
                LocalDate.class,
                builder.function(
                    "timezone",
                    LocalDateTime.class,
                    builder.literal(request.timeZone().getId()),
                    match.get("reliableStart"))));
  }

  /**
   * Applies the F02 current-visibility predicate, selector and shared category boundaries before
   * paging.
   *
   * @param query owning native selection
   * @param builder native criteria builder
   * @param match accepted match root
   * @param day loading-zone day expression
   * @param request admitted selector and exclusive continuation
   * @param now one application-sampled evaluation instant
   * @return eligible rows without joins that multiply encounter identities
   */
  private Predicate calendarScope(
      CriteriaQuery<?> query,
      CriteriaBuilder builder,
      Root<MatchEntity> match,
      Expression<LocalDate> day,
      CalendarRequest request,
      Instant now) {
    List<Predicate> conditions = new ArrayList<>();
    conditions.add(match.get("id").in(visibleIds(query, builder)));
    conditions.add(
        switch (request.kind()) {
          case POOL -> builder.equal(match.get("pool").get("id"), request.id());
          case TEAM ->
              builder.or(
                  builder.equal(match.get("homeTeam").get("id"), request.id()),
                  builder.equal(match.get("awayTeam").get("id"), request.id()));
          case CLUB ->
              builder.and(
                  builder.equal(match.get("pool").get("season").get("id"), request.seasonId()),
                  builder.or(
                      builder.equal(match.get("homeTeam").get("club").get("id"), request.id()),
                      builder.equal(match.get("awayTeam").get("club").get("id"), request.id())));
          case MATCH -> throw new IllegalArgumentException("A match cannot select a calendar");
        });
    // Null result state is an ordinary unknown result, not SQL's unknown boolean in the complement.
    Predicate finalResult =
        builder.and(
            builder.isNotNull(match.get("resultState")),
            builder.equal(match.get("resultState"), ResultStateEnum.FINAL));
    Predicate completed =
        builder.or(
            finalResult,
            builder.and(
                builder.isNotNull(match.get("reliableStart")),
                builder.lessThanOrEqualTo(
                    match.get("reliableStart"),
                    now.minus(MatchPresentation.TIMED_COMPLETION_DELAY))),
            builder.and(
                builder.isNull(match.get("reliableStart")),
                builder.lessThan(
                    match.get("localDate"),
                    now.atZone(MatchPresentation.DATE_ONLY_ZONE).toLocalDate())));
    conditions.add(
        request.category() == CalendarCategoryEnum.COMPLETED ? completed : builder.not(completed));
    if (request.nextDay() != null)
      conditions.add(
          request.category() == CalendarCategoryEnum.UPCOMING
              ? builder.greaterThan(day, request.nextDay())
              : builder.lessThan(day, request.nextDay()));
    return builder.and(conditions.toArray(Predicate[]::new));
  }

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
            SportingVisibilityPredicates.pool(match.get("pool"), builder),
            builder.isTrue(match.get("homeTeam").get("division").get("active")),
            builder.isTrue(match.get("awayTeam").get("division").get("active")),
            builder.exists(home),
            builder.exists(away));
    return selected;
  }

  /** {@inheritDoc} */
  @Override
  public Map<UUID, DivisionDetail> divisions(Set<UUID> ids) {
    if (ids.isEmpty()) return Map.of();
    return divisions.findSummariesByIdIn(ids).stream()
        .map(mapper::toDetail)
        .collect(Collectors.toUnmodifiableMap(DivisionDetail::id, value -> value));
  }

  /** {@inheritDoc} */
  @Override
  public Map<UUID, TeamView> teams(Set<UUID> ids) {
    if (ids.isEmpty()) return Map.of();
    return teams.findViews(ids).stream()
        .collect(Collectors.toUnmodifiableMap(TeamView::id, value -> value));
  }

  /** {@inheritDoc} */
  @Override
  public Map<UUID, PoolView> pools(Set<UUID> ids) {
    if (ids.isEmpty()) return Map.of();
    return pools.findViews(ids).stream()
        .collect(Collectors.toUnmodifiableMap(PoolView::id, value -> value));
  }

  /** {@inheritDoc} */
  @Override
  public Map<UUID, SeasonView> seasons(Set<UUID> ids) {
    if (ids.isEmpty()) return Map.of();
    return seasons.findAllById(ids).stream()
        .map(mapper::toView)
        .collect(Collectors.toUnmodifiableMap(SeasonView::id, value -> value));
  }

  /** {@inheritDoc} */
  @Override
  public Map<UUID, MatchInput> matches(Set<UUID> ids) {
    if (ids.isEmpty()) return Map.of();
    return matches.findPresentationByIdIn(ids).stream()
        .collect(Collectors.toUnmodifiableMap(MatchEntity::getId, mapper::toMatchInput));
  }
}
