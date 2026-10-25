package com.blockout.backend.sporting.application.service;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.List;
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
   * @param name nonblank unique name
   * @param color validated sRGB color
   * @param gradient three validated colors, or null
   * @param image validated PNG/JPEG bytes, or null
   * @param mediaType actual image type, or null
   * @return created division with its initial version
   * @throws AccessDeniedException if the current lifecycle grant is absent
   * @throws SportingConflictException if the name exists ignoring case
   */
  @Transactional
  public DivisionDetail create(
      UUID accountId,
      String name,
      String color,
      List<String> gradient,
      byte[] image,
      String mediaType) {
    authorization.require(accountId, Permission.MANAGE_DIVISION_LIFECYCLE);
    return store.createDivision(name, color, gradient, image, mediaType);
  }

  /**
   * Holds the division root, then the current grant, through the lifecycle commit.
   *
   * @param accountId original account with the lifecycle grant
   * @param id configured division
   * @param revision current editor revision
   * @param active explicit desired activity
   * @return unchanged state for a matching no-op, otherwise the new version
   * @throws SportingConflictException if even a matching command has a stale revision
   * @throws AccessDeniedException if the lifecycle grant is absent or withdrawn
   */
  @Transactional
  public DivisionDetail setActive(UUID accountId, UUID id, String revision, boolean active) {
    permissions.requireForRead(accountId, Permission.MANAGE_DIVISION_LIFECYCLE);
    DivisionDetail current =
        store.lockDivision(id).orElseThrow(SportingResourceNotFoundException::new);
    authorization.require(accountId, Permission.MANAGE_DIVISION_LIFECYCLE);
    SportingEditRevision.require(revision, Long.toString(current.revision()));
    return current.active() == active ? current : store.setDivisionActive(id, active);
  }
}
