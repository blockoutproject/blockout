package com.blockout.backend.sporting.application.service;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.SportingPresentation.DivisionDefinition;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Division creation and explicit lifecycle, independent of presentation edits. */
@Service
@RequiredArgsConstructor
public class ChangeDivisionLifecycle {
  private final SportingStore store;
  private final ActionAuthorization authorization;
  private final CurrentPermissions permissions;

  /**
   * Creates one active division and its previously validated optional image atomically.
   *
   * @param accountId original account with the lifecycle grant
   * @param definition complete validated name and colors
   * @param image validated PNG/JPEG content, or null
   * @return created division with its initial presentation and activity
   * @throws AccessDeniedException if the current lifecycle grant is absent
   * @throws SportingConflictException if the name exists ignoring case
   */
  @Transactional
  public DivisionDetail create(UUID accountId, DivisionDefinition definition, Image image) {
    authorization.require(accountId, Permission.MANAGE_DIVISION_LIFECYCLE);
    return store.createDivision(
        definition.name(), definition.color(), definition.gradient(), image);
  }

  /**
   * Holds the division root, then the current grant, through the lifecycle commit.
   *
   * @param accountId original account with the lifecycle grant
   * @param id configured division
   * @param active explicit desired activity
   * @return unchanged state for a matching no-op, otherwise the accepted activity
   * @throws AccessDeniedException if the lifecycle grant is absent or withdrawn
   */
  @Transactional
  public DivisionDetail setActive(UUID accountId, UUID id, boolean active) {
    permissions.requireForRead(accountId, Permission.MANAGE_DIVISION_LIFECYCLE);
    DivisionDetail current =
        store.lockDivision(id).orElseThrow(SportingResourceNotFoundException::new);
    authorization.require(accountId, Permission.MANAGE_DIVISION_LIFECYCLE);
    return current.active() == active ? current : store.setDivisionActive(id, active);
  }
}
