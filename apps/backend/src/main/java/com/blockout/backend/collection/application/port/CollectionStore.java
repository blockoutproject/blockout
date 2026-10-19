package com.blockout.backend.collection.application.port;

import com.blockout.backend.collection.application.model.CollectionAttempt;
import com.blockout.backend.collection.application.model.CollectionResult;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.CollectionState.Candidate;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.model.CollectionState.Cycle;
import com.blockout.backend.collection.application.model.CollectionState.Runtime;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.model.CollectionState.StartCycle;
import com.blockout.backend.collection.application.model.CollectionState.Target;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Current-state persistence operations; callers own transactions and runtime-first lock ordering.
 */
public interface CollectionStore {
  /**
   * Reads actual attempt evidence for a bounded selection.
   *
   * @param controlId independent acquisition family
   * @param scopeIds bounded selection batch
   * @return actual current acquisition evidence, never admission timestamps
   */
  List<CollectionAttempt> attempts(UUID controlId, List<UUID> scopeIds);

  /**
   * Reads the environment registration.
   *
   * @return current registration without claiming or changing work
   */
  Runtime runtime();

  /**
   * Holds the shared runtime fence through caller commit.
   *
   * @return registration held under a shared lock through the caller transaction
   */
  Runtime lockRuntime();

  /**
   * Excludes admitted writes while replacing the runtime.
   *
   * @return registration held under an exclusive lock through the caller transaction
   */
  Runtime lockRuntimeForReplacement();

  /**
   * Replaces the exclusively locked startup identity.
   *
   * @param incarnationId new startup; caller already holds the exclusive runtime lock
   * @return flushed native editing revision
   */
  Runtime replaceRuntime(UUID incarnationId);

  /**
   * Resolves the season before loading mutable control state.
   *
   * @param id known control
   * @return canonical season or null for a seasonless family, without loading managed state
   */
  UUID controlSeason(UUID id);

  /**
   * Resolves the season before loading mutable candidate state.
   *
   * @param id known candidate
   * @return immutable canonical season before reading mutable candidate state
   */
  UUID sourceSeason(UUID id);

  /**
   * Resolves immutable cycle owners before locking.
   *
   * @param id known current cycle
   * @return immutable owner references before acquiring locks
   */
  CollectionState.CycleScope cycleScope(UUID id);

  /**
   * Holds cycle completion stable through caller commit.
   *
   * @param id current cycle after runtime/season locks
   * @return context held under a shared cycle lock until caller commit
   */
  CollectionState.Cycle lockCycle(UUID id);

  /**
   * Reads current control configuration.
   *
   * @param id known control identity
   * @return current control, without locking
   */
  Optional<Control> control(UUID id);

  /**
   * Locks the control after its season.
   *
   * @param id control whose season is already locked, if seasonal
   * @return locked control through commit
   */
  Control lockControl(UUID id);

  /**
   * Lists current control configuration.
   *
   * @return complete current configuration list in identity order
   */
  List<Control> controls();

  /**
   * Reads the current supported source.
   *
   * @param id supported source identity
   * @return current binding without locking
   */
  Optional<Source> source(UUID id);

  /**
   * Locks the candidate after its season.
   *
   * @param id candidate whose canonical season is already locked
   * @return locked current candidate
   */
  Source lockSource(UUID id);

  /**
   * Lists current sources within the locked season.
   *
   * @param seasonId locked canonical season
   * @return current source configuration ordered by provider, organizer and identity
   */
  List<Source> sources(UUID seasonId);

  /**
   * Locks the accepted reference on its first initial use without launching it.
   *
   * @param source qualified selected source in the locked season
   * @return locked source with its accepted URL and flushed revision
   */
  Source lockAcceptedSource(CollectionState.Source source);

  /**
   * Creates an unqualified candidate under the owning season lock.
   *
   * @param seasonId canonical open season
   * @param provider designated authority
   * @param organizerReference expected native identity, unique within this season/provider
   * @param candidateUrl syntactically valid proposed URL
   * @return persisted unqualified source
   */
  Source createSource(
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizerReference,
      String candidateUrl);

  /**
   * Persists one approved state change and advances its native editing revision.
   *
   * @param source new mutable state of the locked source
   * @return flushed current state, including a new revision when renewing obsolete intent
   */
  Source saveSource(Source source);

  /**
   * Establishes the seasonal family on first launch without resuming an existing paused control.
   *
   * @param seasonId exclusively locked canonical season
   * @param provider newly launched authority
   */
  void ensureSeasonControl(UUID seasonId, CollectionProviderEnum provider);

  /**
   * Lists only validation requests not yet admitted.
   *
   * @return pending candidates with no admitted cycle, ordered by identity
   */
  List<Source> pendingValidations();

  /**
   * Reads retained current context without a history guarantee.
   *
   * @param id cycle identity
   * @return retained current context, never a guarantee of historical lookup
   */
  Optional<Cycle> cycle(UUID id);

  /**
   * Persists the purpose and allocates a native monotonic order.
   *
   * @param command validated admission identity/context
   * @param mode backend-selected collection mode, null for validation
   * @param candidate exact validation snapshot, null for control
   * @param now logical start timestamp
   * @return persisted current cycle with a database-allocated order
   */
  Cycle createCycle(StartCycle command, CollectionModeEnum mode, Candidate candidate, Instant now);

  /**
   * Consumes pending intent and publishes the admitted context atomically.
   *
   * @param control locked current owner
   * @param cycle newly admitted cycle
   */
  void startControl(Control control, Cycle cycle);

  /**
   * Links the exact candidate without changing its editing revision.
   *
   * @param source locked candidate
   * @param cycle newly admitted validation
   */
  void startValidation(Source source, Cycle cycle);

  /**
   * Removes obsolete context and snapshots without changing accepted facts.
   *
   * @param id previous owner cycle, never the newly admitted cycle
   */
  void discardCycle(UUID id);

  /**
   * Persists one bounded batch of immutable references.
   *
   * @param cycleId newly admitted cycle
   * @param targets one bounded batch of immutable authorized references
   */
  void addTargets(UUID cycleId, List<Target> targets);

  /**
   * Pages the snapshot without a total-count query.
   *
   * @param cycleId current admitted cycle
   * @param page zero-based native page
   * @param size bounded request size
   * @return a native bounded slice in stable kind/scope order
   */
  CollectionState.SnapshotPage targets(UUID cycleId, int page, int size);

  /**
   * Checks membership in the immutable authorized scope.
   *
   * @param cycleId admitted cycle
   * @param scopeId stable sporting/source identity
   * @return whether that identity belongs to the frozen snapshot
   */
  boolean containsTarget(UUID cycleId, UUID scopeId);

  /**
   * Checks the exact admitted acquisition role.
   *
   * @param cycleId current context
   * @param scopeId stable identity
   * @param kind required frozen role
   * @return whether the role belongs to the admitted snapshot
   */
  boolean containsTarget(UUID cycleId, UUID scopeId, CollectionTargetKindEnum kind);

  /**
   * Serializes result writes with completion after runtime and season fencing.
   *
   * @param id retained context
   * @return exclusively locked cycle
   */
  Cycle lockCycleForUpdate(UUID id);

  /**
   * Reads the previous evidence for exactly one stable key.
   *
   * @param controlId independent control
   * @param scopeId stable resource
   * @param stage acquisition stage
   * @param phase acquisition or integration
   * @return current evidence, if an actual attempt has been recorded
   */
  Optional<CollectionResult> result(
      UUID controlId, UUID scopeId, CollectionStageEnum stage, CollectionPhaseEnum phase);

  /**
   * Replaces one current result under its cycle lock.
   *
   * @param controlId admitted owner
   * @param result newer evidence; unrelated keys remain unchanged
   */
  void saveResult(UUID controlId, CollectionResult result);

  /**
   * Pages current evidence without a total count or historical snapshot.
   *
   * @param controlId independent owner
   * @param page zero-based native page
   * @param size bounded page size
   * @return canonical scope/stage/phase order
   */
  CollectionState.ResultPage results(UUID controlId, int page, int size);

  /**
   * Ends an exclusively locked cycle without implying successful collection.
   *
   * @param cycle retained current cycle
   * @param completedAt actual end of selected work
   */
  void complete(Cycle cycle, Instant completedAt);

  /**
   * Reads one exact admitted role in a transaction already holding its runtime fence.
   *
   * @param cycleId current admitted cycle
   * @param scopeId exact target identity
   * @param kind required acquisition role
   * @return frozen target, or empty when that role was not admitted
   */
  Optional<Target> target(UUID cycleId, UUID scopeId, CollectionTargetKindEnum kind);
}
