package com.blockout.backend.sporting.application.model;

import java.util.Set;
import java.util.UUID;

/** Current public names, matching vocabulary and filter values for one indexable identity. */
public record SportingIndexInput(
    UUID id,
    UUID seasonId,
    String sourceName,
    String effectiveName,
    String effectiveShortName,
    Set<Alias> aliases,
    SportingClassification classification,
    String divisionName,
    Set<String> divisionTerms,
    String clubName,
    String city) {
  /** A verified alias belongs to a specific seasonal and source identity. */
  public record Alias(
      UUID seasonId, String organizerReference, String competitionReference, String name) {}

  public SportingIndexInput {
    aliases = Set.copyOf(aliases);
    divisionTerms = Set.copyOf(divisionTerms);
  }
}
