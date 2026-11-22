package com.blockout.backend.sporting.application.model;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.mobile.model.CollectionResourceKindEnum;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Immutable owner reads; these values alone do not establish current public visibility. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SportingViews {
  /** Native pack or pool identity for preparation navigation, without classification metadata. */
  public record CollectionResource(
      UUID id,
      String label,
      CollectionResourceKindEnum kind,
      UUID parentId,
      String phaseReference,
      Integer poolCount) {}

  /**
   * Canonical season identity, independent of F01 lifecycle and source labels.
   *
   * @param id stable season identity
   * @param startYear explicitly qualified sporting year
   * @param label canonical display/confirmation label
   */
  public record SeasonView(UUID id, long startYear, String label) {}

  /** Canonical season's F01 lifecycle, read under the existing owner transaction. */
  public record CollectionSeasonView(
      UUID id, String label, long startYear, CollectionSeasonStateEnum collectionState) {}

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

  /** Administrative setting and effective acquisition value, separate from published facts. */
  public record ClassificationView(
      UUID id, SportingClassification setting, SportingClassification effective) {
    /** Projects the pack's own complete setting. */
    public static ClassificationView from(PackView pack) {
      return new ClassificationView(pack.id(), pack.setting(), pack.setting());
    }

    /** Resolves current inheritance only while the pool has no local override. */
    public static ClassificationView from(PoolClassificationView pool, PackView pack) {
      return new ClassificationView(
          pool.pool().id(),
          pool.setting(),
          SportingClassification.effective(pool.setting(), pack::setting));
    }
  }

  /** Pack state read under its season's transaction. */
  public record PackView(UUID id, UUID seasonId, SportingClassification setting) {}

  /** Pool classification state without exporting a managed entity. */
  public record PoolClassificationView(PoolView pool, SportingClassification setting) {}

  /**
   * Retained participation involved in a correction, including currently absent teams.
   *
   * @param teamId stable team
   * @param poolId retained contextual pool
   * @param classification current published classification of that participation
   */
  public record ParticipationView(
      UUID teamId, UUID poolId, SportingClassification classification) {}

  /**
   * Current division editing state; image delivery remains the public read owner's responsibility.
   *
   * @param id stable identity
   * @param name unique name
   * @param color primary sRGB color
   * @param gradient explicit three colors, or null for ordinary derivation
   * @param hasLogo whether validated bytes are retained
   * @param active independent lifecycle state
   */
  public record DivisionDetail(
      UUID id, String name, String color, List<String> gradient, boolean hasLogo, boolean active) {
    /**
     * Detaches optional colors from persistence.
     *
     * @param id stable division identity
     * @param name unique division name
     * @param color primary sRGB color
     * @param gradient explicit three colors, or null for ordinary derivation
     * @param hasLogo whether validated logo bytes are retained
     * @param active independent lifecycle state
     */
    public DivisionDetail {
      gradient = gradient == null ? null : List.copyOf(gradient);
    }
  }
}
