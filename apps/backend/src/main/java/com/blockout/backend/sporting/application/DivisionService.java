package com.blockout.backend.sporting.application;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.sporting.application.SportingViews.DivisionDetail;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Division creation and explicit lifecycle, independent of presentation edits. */
@Service
@RequiredArgsConstructor
public class DivisionService {
  private final SportingStore store;
  private final ActionAuthorization authorization;
  private final CurrentPermissions permissions;

  /**
   * Refuses an absent current lifecycle grant before expensive upload validation. This short read
   * authorizes no later write; mutation methods still check the grant under the account lock.
   *
   * @param accountId original account resolved from the validated principal
   * @throws AccessDeniedException if the lifecycle grant is absent
   */
  @Transactional(readOnly = true)
  public void requireLifecycle(UUID accountId) {
    if (!permissions.forAccount(accountId).contains(Permission.MANAGE_DIVISION_LIFECYCLE))
      throw new AccessDeniedException("Division lifecycle is not permitted");
  }

  /**
   * Reads the configured selection list using any of its canonical read-grant alternatives.
   *
   * @param accountId original account
   * @param includeInactive whether inactive configuration is included
   * @return ordered current divisions
   * @throws AccessDeniedException if no supported read grant exists
   */
  @Transactional(readOnly = true)
  public List<DivisionDetail> list(UUID accountId, boolean includeInactive) {
    requireRead(accountId);
    return store.divisions(includeInactive);
  }

  /**
   * Reads current editor state without changing activity or revisions.
   *
   * @param accountId original account
   * @param id requested division
   * @return current editor values
   * @throws AccessDeniedException if no supported read grant exists
   * @throws SportingResourceNotFoundException if the division is absent
   */
  @Transactional(readOnly = true)
  public DivisionDetail get(UUID accountId, UUID id) {
    requireRead(accountId);
    return store.divisionDetail(id).orElseThrow(SportingResourceNotFoundException::new);
  }

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
    requireLifecycle(accountId);
    store.lockDivision(id).orElseThrow(SportingResourceNotFoundException::new);
    authorization.require(accountId, Permission.MANAGE_DIVISION_LIFECYCLE);
    DivisionDetail current = store.divisionDetail(id).orElseThrow();
    if (!Long.toString(current.revision()).equals(revision))
      throw new SportingConflictException("stale-revision", List.of());
    return current.active() == active ? current : store.setDivisionActive(id, active);
  }

  /**
   * Does not infer write grants from read access to the division selection list.
   *
   * @param accountId original account
   * @throws AccessDeniedException if all three read grants are absent
   */
  private void requireRead(UUID accountId) {
    Set<Permission> current = permissions.forAccount(accountId);
    if (!current.contains(Permission.MANAGE_SPORTING_CLASSIFICATION)
        && !current.contains(Permission.MANAGE_SPORTING_PRESENTATION)
        && !current.contains(Permission.MANAGE_DIVISION_LIFECYCLE))
      throw new AccessDeniedException("Division read is not permitted");
  }
}
