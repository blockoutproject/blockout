package com.blockout.backend.sporting.application.service;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Atomic manual presentation commands, with current grants after sporting roots and before effects.
 */
@Service
@RequiredArgsConstructor
public class ChangeSportingPresentation {
  private final SportingStore store;
  private final CurrentPermissions permissions;
  private final ActionAuthorization authorization;

  /**
   * Commits complete validated names and optional image under the sporting root and account locks.
   *
   * @param accountId original account, rechecked after resource locking
   * @param kind club, team or pool
   * @param id stable resource
   * @param edit complete desired metadata and already decoded image
   * @return current accepted state
   */
  @Transactional
  public SportingPresentation.View set(
      UUID accountId, Kind kind, UUID id, SportingPresentation.Edit edit) {
    permissions.requireForRead(accountId, Permission.MANAGE_SPORTING_PRESENTATION);
    store.lockPresentation(kind, id);
    authorization.require(accountId, Permission.MANAGE_SPORTING_PRESENTATION);
    return store.savePresentation(kind, id, edit);
  }

  /**
   * Changes only division presentation, preserving its current explicit activity.
   *
   * @param accountId current operator
   * @param id stable division
   * @param edit complete desired name/colors and validated optional image
   * @return current division state after atomic uniqueness checking
   */
  @Transactional
  public DivisionDetail setDivision(
      UUID accountId, UUID id, SportingPresentation.DivisionEdit edit) {
    permissions.requireForRead(accountId, Permission.MANAGE_SPORTING_PRESENTATION);
    store.lockDivision(id).orElseThrow(SportingResourceNotFoundException::new);
    authorization.require(accountId, Permission.MANAGE_SPORTING_PRESENTATION);
    return store.saveDivisionPresentation(id, edit);
  }
}
