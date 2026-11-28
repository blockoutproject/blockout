package com.blockout.backend.sporting.application;

import jakarta.persistence.criteria.CommonAbstractCriteria;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import java.util.UUID;

/** Owner-controlled database selection for consumers that must filter before paging/counting. */
public interface ConsultationMatchSelection {
  /**
   * Composes current public match eligibility into a consumer's native Criteria query. Only scalar
   * identities cross this boundary; sporting entities and repositories remain private.
   *
   * @param query consuming database selection
   * @param builder native JPA criteria builder
   * @return subquery of currently viewable dated match identities, with no materialized ID list
   */
  Subquery<UUID> visibleIds(CommonAbstractCriteria query, CriteriaBuilder builder);

  /** A consumer adds only its own selection before F03 category/day paging and visibility. */
  @FunctionalInterface
  interface Filter {
    /**
     * Composes a selection using scalar identities from the current match root.
     *
     * @param query owning native Criteria query
     * @param builder native criteria builder
     * @param match scalar match context without managed entities
     * @return predicate that cannot bypass F03's current sporting eligibility
     */
    Predicate select(CommonAbstractCriteria query, CriteriaBuilder builder, MatchFields match);
  }

  /**
   * Scalar identities used by resource and personal selection; none grants current visibility.
   *
   * @param poolId exact contextual pool
   * @param seasonId pool's canonical season
   * @param homeTeamId original seasonal home team
   * @param awayTeamId original seasonal away team
   * @param homeClubId home club when established
   * @param awayClubId away club when established
   */
  record MatchFields(
      Expression<UUID> poolId,
      Expression<UUID> seasonId,
      Expression<UUID> homeTeamId,
      Expression<UUID> awayTeamId,
      Expression<UUID> homeClubId,
      Expression<UUID> awayClubId) {}
}
