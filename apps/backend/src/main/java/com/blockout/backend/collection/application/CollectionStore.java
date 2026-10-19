package com.blockout.backend.collection.application;

import com.blockout.backend.collection.application.CollectionState.Candidate;
import com.blockout.backend.collection.application.CollectionState.Control;
import com.blockout.backend.collection.application.CollectionState.Cycle;
import com.blockout.backend.collection.application.CollectionState.Runtime;
import com.blockout.backend.collection.application.CollectionState.Source;
import com.blockout.backend.collection.application.CollectionState.StartCycle;
import com.blockout.backend.collection.application.CollectionState.Target;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
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
   * @return current source configuration in identity order
   */
  List<Source> sources(UUID seasonId);

  /**
   * Locks the accepted reference on its first initial use without launching it.
   *
   * @param source qualified selected source in the locked season
   */
  void lockAcceptedSource(CollectionState.Source source);

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
}
