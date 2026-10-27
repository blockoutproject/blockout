package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.criteria.CommonAbstractCriteria;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Sporting-owned visibility in the native HQL and Criteria representations used by repository
 * projections and composed selections. Other features use application selection APIs; they cannot
 * depend on entity aliases or redefine these rules. The two native forms avoid a query DSL or
 * interpreting HQL into Criteria; database integration scenarios verify their identical decisions.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
final class SportingVisibilityPredicates {
  /** Current pool eligibility for a query alias named p; closed seasons remain viewable. */
  public static final String POOL =
      "p.catalogEligible = TRUE AND p.calendarEmpty = FALSE AND p.division.active = TRUE";

  /** Current team eligibility for alias t, with r/p reserved inside its participation subquery. */
  public static final String TEAM =
      "t.division.active = TRUE AND EXISTS (SELECT r.id FROM ParticipationEntity r JOIN r.pool p WHERE r.team = t AND r.current = TRUE AND "
          + POOL
          + ")";

  /**
   * Applies the pool rule to a native Criteria path, including closed sporting seasons.
   *
   * @param pool sporting-owned pool path
   * @param builder native criteria builder
   * @return current catalogue, calendar and classification eligibility
   */
  static Predicate pool(Path<PoolEntity> pool, CriteriaBuilder builder) {
    return builder.and(
        builder.isTrue(pool.get("catalogEligible")),
        builder.isFalse(pool.get("calendarEmpty")),
        builder.isTrue(pool.get("division").get("active")));
  }

  /**
   * Applies team classification and at least one currently visible participation in Criteria.
   *
   * @param query owning native selection
   * @param team sporting-owned seasonal team path
   * @param builder native criteria builder
   * @return current team eligibility without materializing participation IDs
   */
  static Predicate team(
      CommonAbstractCriteria query, Path<TeamEntity> team, CriteriaBuilder builder) {
    Subquery<UUID> selected = query.subquery(UUID.class);
    Root<ParticipationEntity> participation = selected.from(ParticipationEntity.class);
    selected
        .select(participation.get("id"))
        .where(
            builder.equal(participation.get("team"), team),
            builder.isTrue(participation.get("current")),
            pool(participation.get("pool"), builder));
    return builder.and(
        builder.isTrue(team.get("division").get("active")), builder.exists(selected));
  }
}
