package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.shared.mapping.TemporalMapping;
import com.blockout.backend.sporting.application.ConsultationMatchSelection;
import com.blockout.backend.sporting.application.ConsultationStore;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import jakarta.persistence.criteria.CommonAbstractCriteria;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
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
  private final SportingPersistenceMapper mapper;

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
  public Map<UUID, DivisionDetail> divisions(Set<UUID> ids) {
    if (ids.isEmpty()) return Map.of();
    return divisions.findSummariesByIdIn(ids).stream()
        .map(mapper::toDetail)
        .collect(Collectors.toUnmodifiableMap(DivisionDetail::id, value -> value));
  }

  /** {@inheritDoc} */
  @Override
  public Map<UUID, MatchInput> matches(Set<UUID> ids) {
    if (ids.isEmpty()) return Map.of();
    return matches.findPresentationByIdIn(ids).stream()
        .collect(Collectors.toUnmodifiableMap(MatchEntity::getId, this::input));
  }

  /**
   * Detaches the fetched match graph while preserving independent source observation times.
   *
   * @param match already selected dated match with its to-one owner graph
   * @return accepted values without visibility or presentation decisions
   */
  private MatchInput input(MatchEntity match) {
    PoolEntity pool = match.getPool();
    return new MatchInput(
        match.getId(),
        pool.getId(),
        match.getHomeTeam().getId(),
        match.getAwayTeam().getId(),
        mapper.toView(pool.getSeason()),
        new SportingClassification(pool.getDivision().getId(), pool.getFormat(), pool.getGender()),
        mapper.toDetail(pool.getDivision()),
        new ConsultationViews.Schedule(
            match.getLocalDate(),
            TemporalMapping.toDate(match.getReliableStart()),
            match.getTimeZone(),
            TemporalMapping.toDate(match.getScheduleObservedAt())),
        mapper.toResult(match),
        match.getResultObservedAt());
  }
}
