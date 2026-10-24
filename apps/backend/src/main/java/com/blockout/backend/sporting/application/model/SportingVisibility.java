package com.blockout.backend.sporting.application.model;

import java.util.Set;
import java.util.UUID;

/** Current owner decision, including independent restrictions without exposing retained facts. */
public record SportingVisibility(UUID id, Kind kind, Set<Reason> reasons) {
  /** Public sporting resource kinds; these identities never imply a replacement resource. */
  public enum Kind {
    CLUB,
    TEAM,
    POOL,
    MATCH
  }

  /** Independent reasons which normal acquisition, follows and old links cannot bypass. */
  public enum Reason {
    CATALOG_ABSENT,
    CALENDAR_EMPTY,
    ITEM_ABSENT,
    DIVISION_INACTIVE,
    UNCLASSIFIED,
    NO_VISIBLE_PARTICIPATION,
    DATE_UNKNOWN
  }

  /**
   * Detaches the current reasons from mutable persistence state.
   *
   * @param id existing stable identity
   * @param kind owning resource kind
   * @param reasons all currently applicable restrictions
   */
  public SportingVisibility {
    reasons = Set.copyOf(reasons);
  }

  /**
   * @return whether this existing identity may currently be exposed publicly
   */
  public boolean viewable() {
    return reasons.isEmpty();
  }
}
