package com.blockout.backend.collection.application.service;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.model.CollectionState.ControlView;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Current operator intent; admission alone starts work, and pause never interrupts admitted work.
 */
@Service
@RequiredArgsConstructor
public class ChangeCollectionControls {
  private final CollectionStore store;
  private final ReadCollectionConfiguration configurationReads;
  private final ChangeCollectionSeasons seasons;
  private final ActionAuthorization authorization;

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
    CollectionRevision.requireRevision(revision, control.revision());
    CollectionLifecycle.requireOpen(season);
    if (enabled) requireLaunched(control, season);
    if (control.enabled() == enabled && (enabled || control.requestId() == null))
      return configurationReads.controlView(control);
    CollectionRevision.requireAdvance(control.revision());
    return configurationReads.controlView(
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
    CollectionRevision.requireRevision(revision, control.revision());
    CollectionLifecycle.requireOpen(season);
    if (!control.enabled()
        || (season != null && season.collectionState() != CollectionSeasonStateEnum.ACTIVE))
      throw new CollectionConflictException("conflict");
    requireLaunched(control, season);
    ControlView current = configurationReads.controlView(control);
    if (current.cycle() != null && current.cycle().state() == CollectionCycleStateEnum.RUNNING)
      return current;
    if (control.requestId() != null) return current;
    CollectionRevision.requireAdvance(control.revision());
    return configurationReads.controlView(
        store.setControlIntent(id, true, UUID.randomUUID(), CollectionModeEnum.MANUAL));
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
}
