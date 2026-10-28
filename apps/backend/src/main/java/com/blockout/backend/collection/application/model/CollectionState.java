package com.blockout.backend.collection.application.model;

import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionFamilyEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.NoArgsConstructor;

/**
 * Immutable current acquisition state; generated object DTOs and managed entities stay at adapters.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class CollectionState {
  /** Bounded current evidence in stable scope/stage/phase order. */
  public record ResultPage(List<CollectionResult> items, long page, boolean hasNext) {
    /**
     * Detaches current evidence from persistence.
     *
     * @param items current scope evidence
     * @param page zero-based requested page
     * @param hasNext whether another page is available
     */
    public ResultPage {
      items = List.copyOf(items);
    }
  }

  /**
   * Current environment startup and safe editing revision; null incarnation means never registered.
   */
  public record Runtime(long revision, UUID incarnationId) {}

  /** Scalar owner reference read before locking, without caching a managed aggregate. */
  public record SeasonScope(UUID seasonId) {}

  /**
   * Immutable cycle owner used to acquire the runtime and season before locking its mutable
   * completion.
   */
  public record CycleScope(UUID incarnationId, UUID controlId, UUID sourceBindingId) {}

  /** Conditional admission command; exactly one control or candidate purpose is required. */
  public record StartCycle(
      UUID cycleId,
      UUID incarnationId,
      UUID controlId,
      UUID sourceBindingId,
      long revision,
      UUID requestId) {}

  /** Admission result distinguishes a committed creation from an identical current-cycle read. */
  public record Admission(Cycle cycle, boolean created) {}

  /** Current cycle context, with a candidate only for validation and a mode only for collection. */
  public record Cycle(
      UUID id,
      UUID incarnationId,
      UUID controlId,
      UUID sourceBindingId,
      long cycleOrder,
      CollectionModeEnum mode,
      CollectionCycleStateEnum state,
      Instant startedAt,
      Instant completedAt,
      long revision,
      UUID requestId,
      Candidate candidate) {}

  /**
   * Candidate evidence frozen at admission; neither URL nor season is inferred by the collector.
   */
  public record Candidate(
      UUID sourceBindingId,
      long revision,
      String candidateUrl,
      String seasonLabel,
      CollectionProviderEnum provider,
      String organizerReference) {}

  /**
   * Terminal collector evidence, bound to the exact admitted candidate. A null reasonType retains
   * an unknown failure category.
   */
  public record SourceValidation(
      UUID cycleId,
      SourceValidationStateEnum state,
      Instant observedAt,
      String seasonEvidence,
      String reason,
      URI reasonType) {}

  /** Current preparation state; proposed and accepted references remain independent. */
  @Builder(toBuilder = true)
  public record Source(
      UUID id,
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizerReference,
      String candidateUrl,
      String acceptedUrl,
      long revision,
      SourceValidationStateEnum validationState,
      Instant validatedAt,
      String seasonEvidence,
      String reason,
      boolean seasonConfirmed,
      boolean locked,
      boolean launched,
      UUID currentCycleId,
      URI reasonType) {}

  /**
   * Current control and retained pending scope; empty selections mean the ordinary whole family.
   */
  public record Control(
      UUID id,
      UUID seasonId,
      CollectionFamilyEnum family,
      long revision,
      boolean enabled,
      UUID requestId,
      CollectionModeEnum requestedMode,
      UUID currentCycleId,
      Instant lastStartedAt,
      Instant lastAttemptAt,
      Instant lastSuccessAt,
      Set<UUID> sourceBindingIds,
      Set<UUID> scopeIds) {
    /**
     * Detaches pending selections from managed collections.
     *
     * @param id current control identity
     * @param seasonId owning season, absent for seasonless collection
     * @param family independently controlled acquisition family
     * @param revision current editing revision
     * @param enabled desired periodic eligibility
     * @param requestId pending explicit request, when present
     * @param requestedMode pending explicit collection mode
     * @param currentCycleId most recent admitted cycle, when present
     * @param lastStartedAt most recent admitted start, when known
     * @param lastAttemptAt most recent observed attempt, when known
     * @param lastSuccessAt most recent successful observation, when known
     * @param sourceBindingIds requested roots, empty for the whole family
     * @param scopeIds requested narrower scopes, empty for the whole selection
     */
    public Control {
      sourceBindingIds = Set.copyOf(sourceBindingIds);
      scopeIds = Set.copyOf(scopeIds);
    }
  }

  /** Operator projection keeps desired activity and confirmed execution independent. */
  public record ControlView(Control control, Cycle cycle) {}

  /** Read-only work projection; its construction never claims work. */
  public record Work(List<ControlWork> controls, List<Candidate> validations) {
    /**
     * Detaches the complete, configuration-bounded lists.
     *
     * @param controls current independent scheduling contexts
     * @param validations candidates awaiting validation
     */
    public Work {
      controls = List.copyOf(controls);
      validations = List.copyOf(validations);
    }
  }

  /** Scheduling context hides obsolete running cycles without updating their persisted history. */
  public record ControlWork(
      UUID id,
      CollectionFamilyEnum family,
      UUID seasonId,
      long revision,
      boolean enabled,
      CollectionSeasonStateEnum seasonState,
      UUID requestId,
      CollectionModeEnum requestedMode,
      UUID runningCycleId,
      Instant lastStartedAt) {}

  /** Frozen acquisition identity/configuration; personal locality is deliberately absent. */
  @Builder(toBuilder = true)
  public record Target(
      UUID scopeId,
      CollectionTargetKindEnum kind,
      UUID sourceBindingId,
      String url,
      String seasonLabel,
      String competitionReference,
      String packReference,
      String poolReference,
      String tourReference,
      String groupReference,
      UUID poolId,
      UUID matchId,
      UUID clubId,
      String clubReference,
      UUID divisionId,
      SportFormatEnum format,
      SportGenderEnum gender,
      Instant lastAttemptAt,
      Instant lastSuccessAt,
      Instant fastWindowEndsAt,
      CollectionProviderEnum provider,
      String organizerReference,
      String nativeMatchReference,
      String nativeTeamReference) {}

  /**
   * One served target enriches its frozen identity with current permitted locality, when
   * applicable.
   */
  public record ServedTarget(
      Target target, String localityRevision, String municipality, String postalCode) {}

  /** Database snapshot page without personal values or a total-count query. */
  public record SnapshotPage(List<Target> items, boolean hasNext) {
    /**
     * Detaches the selected immutable rows.
     *
     * @param items admitted frozen targets
     * @param hasNext whether another snapshot page exists
     */
    public SnapshotPage {
      items = List.copyOf(items);
    }
  }

  /** Stable bounded read of the admitted snapshot, without a total-count query. */
  public record TargetPage(List<ServedTarget> items, long page, boolean hasNext) {
    /**
     * Detaches page contents from persistence.
     *
     * @param items served targets with current permitted locality
     * @param page zero-based requested page
     * @param hasNext whether another snapshot page exists
     */
    public TargetPage {
      items = List.copyOf(items);
    }
  }
}
