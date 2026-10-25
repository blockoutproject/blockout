package com.blockout.backend.sporting.application.service;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.model.SportingPresentation.Contacts;
import com.blockout.backend.sporting.application.model.SportingViews.ClassificationView;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.model.SportingViews.PoolClassificationView;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Current sporting editor state under the exact action-specific read grants. */
@Service
@RequiredArgsConstructor
public class ReadSportingConfiguration {
  private final SportingStore store;
  private final CurrentPermissions permissions;

  /**
   * Loads one coherent pool editor response within the caller transaction.
   *
   * @param poolId current pool identity
   * @return local setting and applicable inheritance
   */
  private ClassificationView poolDetail(UUID poolId) {
    PoolClassificationView pool =
        store.poolClassification(poolId).orElseThrow(SportingResourceNotFoundException::new);
    return ClassificationView.from(pool, store.pack(pool.pool().packId()).orElseThrow());
  }

  /**
   * Reads local and inherited pool values in the same transaction.
   *
   * @param accountId original established account with a current classification grant
   * @param poolId contextual pool
   * @return current setting, inheritance and opaque revision
   * @throws AccessDeniedException if the current grant is absent
   * @throws SportingResourceNotFoundException if the pool is absent
   */
  @Transactional(readOnly = true)
  public ClassificationView pool(UUID accountId, UUID poolId) {
    permissions.requireForRead(accountId, Permission.MANAGE_SPORTING_CLASSIFICATION);
    return poolDetail(poolId);
  }

  /**
   * Reads the current pack setting for an operator with the classification grant.
   *
   * @param accountId original established account with a current classification grant
   * @param packId native grouping
   * @return current setting and revision
   * @throws AccessDeniedException if the current grant is absent
   * @throws SportingResourceNotFoundException if the pack is absent
   */
  @Transactional(readOnly = true)
  public ClassificationView pack(UUID accountId, UUID packId) {
    permissions.requireForRead(accountId, Permission.MANAGE_SPORTING_CLASSIFICATION);
    return ClassificationView.from(
        store.pack(packId).orElseThrow(SportingResourceNotFoundException::new));
  }

  /**
   * Does not infer write grants from read access to the division selection list.
   *
   * @param accountId original account
   * @throws AccessDeniedException if all three read grants are absent
   */
  private void requireDivisionRead(UUID accountId) {
    Set<Permission> current = permissions.forAccount(accountId);
    if (!current.contains(Permission.MANAGE_SPORTING_CLASSIFICATION)
        && !current.contains(Permission.MANAGE_SPORTING_PRESENTATION)
        && !current.contains(Permission.MANAGE_DIVISION_LIFECYCLE))
      throw new AccessDeniedException("Division read is not permitted");
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
  public DivisionDetail division(UUID accountId, UUID id) {
    requireDivisionRead(accountId);
    return store.divisionDetail(id).orElseThrow(SportingResourceNotFoundException::new);
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
  public List<DivisionDetail> divisions(UUID accountId, boolean includeInactive) {
    requireDivisionRead(accountId);
    return store.divisions(includeInactive);
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
  public SportingPresentation.View presentation(UUID accountId, Kind kind, UUID id) {
    permissions.requireForRead(accountId, Permission.MANAGE_SPORTING_PRESENTATION);
    return store.presentation(kind, id).orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Reads only currently permitted contact values and independent management modes.
   *
   * @param accountId original account with the contact-correction grant
   * @param clubId established organization
   * @return current editor state without previous personal values
   */
  @Transactional(readOnly = true)
  public Contacts clubContacts(UUID accountId, UUID clubId) {
    permissions.requireForRead(accountId, Permission.MANAGE_SPORTING_PRESENTATION);
    return store.clubContacts(clubId);
  }
}
