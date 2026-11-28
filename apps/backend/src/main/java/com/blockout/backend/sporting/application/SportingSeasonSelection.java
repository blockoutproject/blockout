package com.blockout.backend.sporting.application;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Subquery;
import java.util.UUID;

/**
 * Owner-controlled scalar season selection for consumers composing current sporting eligibility.
 */
public interface SportingSeasonSelection {
  /**
   * Adds the canonical season root and its current visible target selections to a native query.
   * Consumers compose their own relationships before projection; no target IDs are materialized.
   *
   * @param query consumer-owned criteria query
   * @param builder native criteria builder
   * @return scalar season fields and correlated eligible team/pool identities
   */
  Season select(CriteriaQuery<?> query, CriteriaBuilder builder);

  /**
   * Scalar query expressions without exposing sporting entities or their relationships.
   *
   * @param id canonical season identity
   * @param startYear sporting start year
   * @param label canonical display label
   * @param pools currently visible pools in this season, including closed seasons
   * @param teams currently visible teams in this season
   */
  record Season(
      Expression<UUID> id,
      Expression<Long> startYear,
      Expression<String> label,
      Subquery<UUID> pools,
      Subquery<UUID> teams) {}
}
