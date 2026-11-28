package com.blockout.backend.contributions.domain;

import com.blockout.backend.contributions.domain.ContributionVersion.State;

/** Exact lifecycle rules shared by commands and their current private action projection. */
public final class ContributionDecision {
  /** No instances; useful decisions remain facts on their owning version. */
  private ContributionDecision() {}

  /**
   * Identifies historical sources eligible for an explicit new version, excluding cancellations.
   *
   * @param state exact retained source lifecycle
   * @return whether reactivation may be considered under current publication restrictions
   */
  public static boolean canReactivate(State state) {
    return switch (state) {
      case REJECTED, WITHDRAWN, HIDDEN, REPLACED, SUPERSEDED -> true;
      default -> false;
    };
  }
}
