package com.blockout.backend.sporting.application;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import java.util.Set;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Immutable owner reads; these values alone do not establish current public visibility. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SportingViews {
  /**
   * Canonical season identity, independent of F01 lifecycle and source labels.
   *
   * @param id stable season identity
   * @param startYear explicitly qualified sporting year
   * @param label canonical display/confirmation label
   */
  public record SeasonView(UUID id, long startYear, String label) {}

  /**
   * Persistent organization, even before a club-page read succeeds.
   *
   * @param id stable club identity
   * @param provider authoritative reference owner
   * @param reference exact reference, retaining leading zeros
   * @param sourceName attributable source label, or null when unknown
   */
  public record ClubView(
      UUID id, CollectionProviderEnum provider, String reference, String sourceName) {}

  /**
   * Minimal division state used by classification and discovery owners.
   *
   * @param id stable division identity
   * @param name unique case-insensitive name
   * @param active explicit state; presentation never changes it implicitly
   * @param searchTerms controlled owner-linked terms, not identity aliases
   */
  public record DivisionView(UUID id, String name, boolean active, Set<String> searchTerms) {
    /**
     * Detaches controlled terms from persistence collections.
     *
     * @param id stable identity
     * @param name current name
     * @param active explicit activity
     * @param searchTerms current technical search terms
     */
    public DivisionView {
      searchTerms = Set.copyOf(searchTerms);
    }
  }

  /**
   * Established contextual pool with its accepted classification.
   *
   * @param id stable pool identity
   * @param key native provider/season/competition/tour/group identity
   * @param packId native grouping, independent of team identity
   * @param sourceName current source label
   * @param classification last accepted complete classification
   */
  public record PoolView(
      UUID id,
      PoolKey key,
      UUID packId,
      String sourceName,
      SportingClassification classification) {}

  /**
   * Seasonal team identity; an optional professional club never re-keys it.
   *
   * @param id stable team identity
   * @param seasonId owning canonical season
   * @param provider designated sporting source
   * @param organizerReference qualified source context
   * @param competitionReference native competition/championship
   * @param nativeReference LNV TeamID, or optional FFVB reference
   * @param sourceName current source label, distinct from manual presentation
   * @param comparisonName established FFVB comparison key
   * @param clubId required FFVB club or optional technical professional association
   * @param classification accepted sporting classification
   */
  public record TeamView(
      UUID id,
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizerReference,
      String competitionReference,
      String nativeReference,
      String sourceName,
      String comparisonName,
      UUID clubId,
      SportingClassification classification) {}

  /**
   * Stable encounter; schedule and result acceptance are separate from identity.
   *
   * @param id stable match identity
   * @param poolId owning contextual pool
   * @param reference native match reference inside that pool
   * @param homeTeamId established home team
   * @param awayTeamId established away team
   */
  public record MatchView(
      UUID id, UUID poolId, String reference, UUID homeTeamId, UUID awayTeamId) {}
}
