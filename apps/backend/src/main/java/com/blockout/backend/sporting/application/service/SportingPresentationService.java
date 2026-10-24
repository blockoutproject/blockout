package com.blockout.backend.sporting.application.service;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Atomic manual presentation commands, with current grants after sporting roots and before effects.
 */
@Service
@RequiredArgsConstructor
public class SportingPresentationService {
  private final SportingStore store;
  private final CurrentPermissions permissions;
  private final ActionAuthorization authorization;

  /**
   * Performs a cheap current-grant check before decoding uploads; it authorizes no later write.
   *
   * @param accountId original current business account
   * @throws AccessDeniedException when the presentation grant is absent
   */
  @Transactional(readOnly = true)
  public void requireGrant(UUID accountId) {
    if (!permissions.forAccount(accountId).contains(Permission.MANAGE_SPORTING_PRESENTATION))
      throw new AccessDeniedException("Sporting presentation is not permitted");
  }

  /**
   * Reads current complete editor state under its action-specific grant.
   *
   * @param accountId current account
   * @param kind club, team or pool
   * @param id stable resource
   * @return current independently editable names and artwork
   */
  @Transactional(readOnly = true)
  public SportingPresentation.View get(UUID accountId, Kind kind, UUID id) {
    requireGrant(accountId);
    return store.presentation(kind, id).orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Commits complete validated names and optional image under the sporting root and account locks.
   *
   * @param accountId original account, rechecked after resource locking
   * @param kind club, team or pool
   * @param id stable resource
   * @param edit complete desired metadata and already decoded image
   * @return current state, preserving revision on a matching no-op
   * @throws SportingConflictException for stale state, including a stale matching no-op
   */
  @Transactional
  public SportingPresentation.View set(
      UUID accountId, Kind kind, UUID id, SportingPresentation.Edit edit) {
    requireGrant(accountId);
    store.lockPresentation(kind, id);
    authorization.require(accountId, Permission.MANAGE_SPORTING_PRESENTATION);
    SportingPresentation.View current =
        store.presentation(kind, id).orElseThrow(SportingResourceNotFoundException::new);
    requireRevision(edit.revision(), current.revision());
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
    requireGrant(accountId);
    DivisionDetail current =
        store.lockDivision(id).orElseThrow(SportingResourceNotFoundException::new);
    authorization.require(accountId, Permission.MANAGE_SPORTING_PRESENTATION);
    requireRevision(edit.revision(), Long.toString(current.revision()));
    return store.saveDivisionPresentation(id, edit);
  }

  /**
   * Applies the existing body-revision conflict protocol without a second HTTP validator.
   *
   * @param expected revision captured by the editor
   * @param current current relevant owner state
   */
  private void requireRevision(String expected, String current) {
    if (!current.equals(expected)) throw new SportingConflictException("stale-revision", List.of());
  }
}
