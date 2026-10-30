package com.blockout.backend.sporting.application;

import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import java.util.UUID;

/** Sporting-owned scalar targets for consumers selecting current teams or pools before paging. */
public interface SportingTargetSelection {
  /**
   * Adds one sporting root with its effective public name and current eligibility.
   *
   * @param kind TEAM or POOL, the two seasonal target kinds supported by this selection
   * @param query consumer-owned native query
   * @param builder native criteria builder
   * @return scalar fields and the mandatory current visibility predicate; no managed entity escapes
   * @throws IllegalArgumentException for a kind without this seasonal target projection
   */
  Target select(Kind kind, CriteriaQuery<?> query, CriteriaBuilder builder);

  /**
   * Scalar sporting expressions without sharing persistence entities or private visibility rules.
   *
   * @param id original sporting identity
   * @param name effective current public name, without a normalized copy
   * @param seasonId canonical sporting season
   * @param visible mandatory owner-defined eligibility predicate
   */
  record Target(
      Expression<UUID> id, Expression<String> name, Expression<UUID> seasonId, Predicate visible) {}
}
