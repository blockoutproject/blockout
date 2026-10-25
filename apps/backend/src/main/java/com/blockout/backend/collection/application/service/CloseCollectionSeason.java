package com.blockout.backend.collection.application.service;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.InvalidSeasonConfirmationException;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Terminal acquisition closure shares admission's runtime/season/control/account lock order. */
@Service
@RequiredArgsConstructor
public class CloseCollectionSeason {
  private final CollectionStore store;
  private final ChangeCollectionSeasons seasons;
  private final ActionAuthorization authorization;

  /**
   * Closes only the selected season and cancels its unstarted control intents atomically.
   *
   * @param accountId operator holding the current collection grant
   * @param seasonId canonical season
   * @param revision preparation revision read before confirmation
   * @param confirmation exact canonical label, without trimming or normalization
   * @return terminal season; source locks, accepted data and admitted cycles remain intact
   * @throws InvalidSeasonConfirmationException when the label differs
   * @throws CollectionConflictException for closed history or stale revision
   */
  @Transactional
  public CollectionSeasonView close(
      UUID accountId, UUID seasonId, long revision, String confirmation) {
    store.lockRuntime();
    CollectionSeasonView season = seasons.lockCollectionState(seasonId);
    List<Control> controls =
        store.controls(seasonId).stream().map(control -> store.lockControl(control.id())).toList();
    authorization.require(accountId, Permission.MANAGE_COLLECTION);
    CollectionRevision.requireRevision(revision, season.collectionRevision());
    CollectionLifecycle.requireOpen(season);
    if (!season.label().equals(confirmation)) throw new InvalidSeasonConfirmationException();
    CollectionRevision.requireAdvance(season.collectionRevision());
    for (Control control : controls) {
      if (control.requestId() != null) {
        CollectionRevision.requireAdvance(control.revision());
        store.setControlIntent(control.id(), control.enabled(), null, null);
      }
    }
    return seasons.closeCollectionSeason(seasonId);
  }
}
