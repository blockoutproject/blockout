package com.blockout.backend.sporting.infrastructure;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * F02-owned HQL visibility for storage projections in the same database. Consumers may compose
 * scalar reads without importing sporting entities/repositories or independently redefining
 * eligibility.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SportingVisibilityPredicates {
  /** Current pool eligibility for a query alias named p; closed seasons remain viewable. */
  public static final String POOL =
      "p.catalogEligible = TRUE AND p.calendarEmpty = FALSE AND p.division.active = TRUE";

  /** Current team eligibility for alias t, with r/p reserved inside its participation subquery. */
  public static final String TEAM =
      "t.division.active = TRUE AND EXISTS (SELECT r.id FROM ParticipationEntity r JOIN r.pool p WHERE r.team = t AND r.current = TRUE AND "
          + POOL
          + ")";
}
