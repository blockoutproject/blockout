package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.sporting.application.ConsultationMatchSelection;
import com.blockout.backend.sporting.application.ConsultationViews.MatchSummary;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CommonAbstractCriteria;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** F02/F03 eligibility composition and bounded current presentation, with no notification state. */
@Repository
@RequiredArgsConstructor
public class JpaConsultationMatchSelection implements ConsultationMatchSelection {
  private final EntityManager entities;
  private final JpaConsultationReadAdapter presentation;

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
  public Map<UUID, MatchSummary> summaries(Set<UUID> ids, Instant now) {
    if (ids.isEmpty()) return Map.of();
    return entities
        .createQuery(
            """
      SELECT m FROM MatchEntity m
      JOIN FETCH m.pool p JOIN FETCH p.season JOIN FETCH p.division
      JOIN FETCH m.homeTeam h JOIN FETCH h.season JOIN FETCH h.division LEFT JOIN FETCH h.club
      JOIN FETCH m.awayTeam a JOIN FETCH a.season JOIN FETCH a.division LEFT JOIN FETCH a.club
      WHERE m.id IN :ids
      """,
            MatchEntity.class)
        .setParameter("ids", ids)
        .getResultList()
        .stream()
        .collect(
            Collectors.toUnmodifiableMap(
                MatchEntity::getId, m -> presentation.matchSummary(m, now)));
  }
}
