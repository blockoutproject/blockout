package com.blockout.backend.search.application;

import java.util.List;
import java.util.UUID;

/**
 * Ordered visit selection; current eligibility is rechecked and missing identities never get
 * replacements.
 */
public record SearchExamples(List<UUID> identities) {
  /**
   * Detaches at most five distinct resource identities; an empty retained selection stays empty.
   *
   * @param identities selected UUIDs in their original presentation order
   * @throws IllegalArgumentException for duplicate or oversized selections
   */
  public SearchExamples {
    identities = List.copyOf(identities);
    if (identities.size() > 5 || identities.stream().distinct().count() != identities.size())
      throw new IllegalArgumentException("Invalid retained examples");
  }
}
