package com.blockout.backend.collection.application.service;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.CollectionNotFoundException;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.model.CollectionState.ControlView;
import com.blockout.backend.collection.application.model.CollectionState.Cycle;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.SeasonService;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Current operator intent; admission alone starts work, and pause never interrupts admitted work.
 */
@Service
@RequiredArgsConstructor
public class CollectionControlService {
  private final CollectionStore store;
  private final SeasonService seasons;
  private final CurrentPermissions permissions;
  private final ActionAuthorization authorization;

  /**
   * Reads a complete family-then-identity list without admission or provider calls.
   *
   * @param accountId current operator
   * @param seasonId selected competition season, or null for seasonless controls
   * @return desired intent with independently retained cycle and freshness evidence
   */
  @Transactional(readOnly = true)
  public List<ControlView> list(UUID accountId, UUID seasonId) {
    requireRead(accountId);
    if (seasonId != null) seasons.collectionState(seasonId);
    return store.controls(seasonId).stream()
        .sorted(
            Comparator.comparing((Control control) -> control.family().getValue())
                .thenComparing(Control::id))
        .map(this::view)
        .toList();
  }

  /**
   * Reads current status after an uncertain command without repeating it.
   *
   * @param accountId current operator
   * @param id independent control
   * @return current desired, pending and confirmed execution state
   */
  @Transactional(readOnly = true)
  public ControlView get(UUID accountId, UUID id) {
    requireRead(accountId);
    return view(store.control(id).orElseThrow(CollectionNotFoundException::new));
  }

  /**
   * Replaces desired eligibility; pause cancels pending intent, while resume recreates none.
   *
   * @param accountId current operator checked under its account lock
   * @param id independent control
   * @param revision last read editing revision
   * @param enabled desired ordinary eligibility
   * @return current state; matching no-op preserves the revision
   */
  @Transactional
  public ControlView setActivity(UUID accountId, UUID id, long revision, boolean enabled) {
    store.lockRuntime();
    UUID seasonId = store.controlSeason(id);
    CollectionSeasonView season = seasonId == null ? null : seasons.lockCollectionState(seasonId);
    Control control = store.lockControl(id);
    authorization.require(accountId, Permission.MANAGE_COLLECTION);
    requireRevision(revision, control.revision());
    requireOpen(season);
    if (enabled) requireLaunched(control, season);
    if (control.enabled() == enabled && (enabled || control.requestId() == null))
      return view(control);
    CollectorRuntimeService.requireAdvance(control.revision());
    return view(
        store.setControlIntent(
            id,
            enabled,
            enabled ? control.requestId() : null,
            enabled ? control.requestedMode() : null));
  }

  /**
   * Accepts one ordinary family request after checking current authorization and eligibility.
   *
   * @param accountId current operator, never retained as a future actor session
   * @param id selected family
   * @param revision last read editing revision
   * @return existing running work or a single pending intent; acceptance promises no start time
   */
  @Transactional
  public ControlView request(UUID accountId, UUID id, long revision) {
    store.lockRuntime();
    UUID seasonId = store.controlSeason(id);
    CollectionSeasonView season = seasonId == null ? null : seasons.lockCollectionState(seasonId);
    Control control = store.lockControl(id);
    authorization.require(accountId, Permission.MANAGE_COLLECTION);
    requireRevision(revision, control.revision());
    requireOpen(season);
    if (!control.enabled()
        || (season != null && season.collectionState() != CollectionSeasonStateEnum.ACTIVE))
      throw new CollectionConflictException("conflict");
    requireLaunched(control, season);
    ControlView current = view(control);
    if (current.cycle() != null && current.cycle().state() == CollectionCycleStateEnum.RUNNING)
      return current;
    if (control.requestId() != null) return current;
    CollectorRuntimeService.requireAdvance(control.revision());
    return view(store.setControlIntent(id, true, UUID.randomUUID(), CollectionModeEnum.MANUAL));
  }

  /**
   * Refuses an unlaunched provider even when another provider has activated the same season.
   *
   * @param control locked family whose launch is required
   * @param season locked canonical season, or null for seasonless controls
   */
  private void requireLaunched(Control control, CollectionSeasonView season) {
    if (season != null
        && (season.collectionState() != CollectionSeasonStateEnum.ACTIVE
            || store.sources(season.id()).stream()
                .noneMatch(
                    source ->
                        source.launched()
                            && source.provider().getValue().equals(control.family().getValue()))))
      throw new CollectionConflictException("conflict");
  }

  /**
   * Combines current intent and retained cycle without mutating interrupted execution.
   *
   * @param control detached current configuration
   * @return independent intent and retained execution evidence
   */
  private ControlView view(Control control) {
    Cycle cycle =
        control.currentCycleId() == null
            ? null
            : store.cycle(control.currentCycleId()).orElse(null);
    return new ControlView(control, cycle);
  }

  /**
   * Refuses a closed season before returning any existing pending or running state.
   *
   * @param season locked season, or null for seasonless work
   */
  private void requireOpen(CollectionSeasonView season) {
    if (season != null && season.collectionState() == CollectionSeasonStateEnum.CLOSED)
      throw new CollectionConflictException("conflict");
  }

  /**
   * Rejects stale editor state without effects, including duplicate requests.
   *
   * @param expected submitted revision
   * @param actual current locked revision
   */
  private void requireRevision(long expected, long actual) {
    if (expected != actual) throw new CollectionConflictException("stale-revision");
  }

  /**
   * Current collection permission is independent of moderator and sporting-management powers.
   *
   * @param accountId operator resolved from the current authenticated principal
   */
  private void requireRead(UUID accountId) {
    if (!permissions.forAccount(accountId).contains(Permission.MANAGE_COLLECTION))
      throw new AccessDeniedException("Collection management is not permitted");
  }
}
