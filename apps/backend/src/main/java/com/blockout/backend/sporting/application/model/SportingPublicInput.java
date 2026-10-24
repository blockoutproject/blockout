package com.blockout.backend.sporting.application.model;

import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Current public search inputs for one eligible identity. Presentation fields reflect current
 * independent source/manual names and permitted effective locality. No contact details, provider
 * URL or saved index document crosses this boundary.
 */
public record SportingPublicInput(
    UUID id,
    Kind kind,
    UUID seasonId,
    String sourceName,
    String effectiveName,
    String effectiveShortName,
    Set<Alias> aliases,
    SportingClassification classification,
    String divisionName,
    Set<String> divisionTerms,
    UUID clubId,
    String clubName,
    String city,
    List<UUID> poolIds) {
  /** A verified alias keeps its owning season and source context, rather than becoming global. */
  public record Alias(
      UUID seasonId, String organizerReference, String competitionReference, String name) {}

  /**
   * Detaches all public inputs from the persistence transaction.
   *
   * @param id stable identity
   * @param kind club, team or pool
   * @param seasonId canonical season, absent for clubs
   * @param sourceName current authorized source label, possibly unknown
   * @param effectiveName current effective full name
   * @param effectiveShortName independent effective team/pool short name, absent for clubs
   * @param aliases qualified current aliases
   * @param classification accepted classification, absent for clubs
   * @param divisionName current division label
   * @param divisionTerms current controlled search terms
   * @param clubId optional attached organization
   * @param clubName current attached organization name
   * @param city effective permitted municipality, never a restricted value
   * @param poolIds current eligible participations, empty for clubs and pools
   */
  public SportingPublicInput {
    aliases = Set.copyOf(aliases);
    divisionTerms = Set.copyOf(divisionTerms);
    poolIds = List.copyOf(poolIds);
  }
}
