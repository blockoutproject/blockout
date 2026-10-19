package com.blockout.backend.sporting.application.service;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.ClassificationView;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionView;
import com.blockout.backend.sporting.application.model.SportingViews.PackView;
import com.blockout.backend.sporting.application.model.SportingViews.ParticipationView;
import com.blockout.backend.sporting.application.model.SportingViews.PoolClassificationView;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Complete, season-serialized classification corrections preserving sporting identities. */
@Service
@RequiredArgsConstructor
public class ClassificationService {
  private final SportingStore store;
  private final CurrentPermissions permissions;
  private final ActionAuthorization authorization;

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
    requireRead(accountId);
    return detail(store.pack(packId).orElseThrow(SportingResourceNotFoundException::new));
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
    requireRead(accountId);
    return poolDetail(poolId);
  }

  /**
   * Replaces a default and validates every non-overridden pool before any effect.
   *
   * @param accountId original established account with a current classification grant
   * @param packId native grouping in the locked season
   * @param revision opaque current editor revision
   * @param setting complete default, or null to stop inheritance
   * @return updated editor state; matching commands retain their revision
   * @throws SportingConflictException for stale state, inactive assignment or conflicting
   *     identities
   * @throws AccessDeniedException if authorization is absent or withdrawn before the account lock
   */
  @Transactional
  public ClassificationView setPack(
      UUID accountId, UUID packId, String revision, SportingClassification setting) {
    requireRead(accountId);
    store.lockPackSeason(packId);
    PackView pack = store.pack(packId).orElseThrow(SportingResourceNotFoundException::new);
    DivisionView division = lockDivision(setting);
    authorization.require(accountId, Permission.MANAGE_SPORTING_CLASSIFICATION);
    requireRevision(revision, detail(pack).revision());
    if (Objects.equals(setting, pack.setting())) return detail(pack);
    List<UUID> pools =
        store.packPools(packId).stream()
            .filter(pool -> pool.setting() == null)
            .map(pool -> pool.pool().id())
            .toList();
    requireActive(division, pools);
    correct(pools, setting);
    store.setPackClassification(packId, setting);
    return detail(store.pack(packId).orElseThrow());
  }

  /**
   * Replaces an override, or restores inheritance, atomically with published corrections.
   *
   * @param accountId original established account with a current classification grant
   * @param poolId contextual pool in the locked season
   * @param revision opaque revision including applicable inheritance
   * @param setting complete override, or null to inherit
   * @return updated editor state without erasing published data on absent acquisition
   * @throws SportingConflictException for stale state, inactive assignment or conflicting
   *     identities
   * @throws AccessDeniedException if authorization is absent or withdrawn before the account lock
   */
  @Transactional
  public ClassificationView setPool(
      UUID accountId, UUID poolId, String revision, SportingClassification setting) {
    requireRead(accountId);
    // Resolve only an immutable season reference before loading mutable editor state.
    store.lockPoolSeason(poolId);
    PoolClassificationView pool = store.poolClassification(poolId).orElseThrow();
    PackView pack = store.pack(pool.pool().packId()).orElseThrow();
    SportingClassification effective = setting == null ? pack.setting() : setting;
    DivisionView division = lockDivision(effective);
    authorization.require(accountId, Permission.MANAGE_SPORTING_CLASSIFICATION);
    requireRevision(revision, detail(pool, pack).revision());
    if (Objects.equals(setting, pool.setting())) return detail(pool, pack);
    requireActive(division, List.of(poolId));
    correct(List.of(poolId), effective);
    store.setPoolClassification(poolId, setting);
    return poolDetail(poolId);
  }

  /**
   * Checks every retained participation and target identity before changing a single row.
   *
   * @param poolIds entire affected scope in one locked season
   * @param target complete replacement, or null to retain published facts
   * @throws SportingConflictException if any identity or outside participation conflicts
   */
  private void correct(List<UUID> poolIds, SportingClassification target) {
    if (target == null) return;
    List<TeamView> teams = store.teamsInPools(poolIds);
    List<UUID> teamIds = teams.stream().map(TeamView::id).toList();
    Set<UUID> conflicts = new LinkedHashSet<>();
    for (ParticipationView participation : store.participations(teamIds)) {
      if (!poolIds.contains(participation.poolId())
          && !participation.classification().equals(target)) {
        conflicts.add(participation.poolId());
        conflicts.add(participation.teamId());
      }
    }
    conflicts.addAll(store.classificationCollisions(teamIds, target));
    if (!conflicts.isEmpty()) {
      conflicts.addAll(poolIds);
      throw new SportingConflictException("classification-conflict", List.copyOf(conflicts));
    }
    store.correctClassification(poolIds, teamIds, target);
  }

  /**
   * Locks the target division before the account lock so deactivation cannot race acceptance.
   *
   * @param classification proposed complete assignment, or null
   * @return locked activity state, or null for removal
   * @throws SportingConflictException if the target is unknown
   */
  private DivisionView lockDivision(SportingClassification classification) {
    return classification == null
        ? null
        : store
            .lockDivision(classification.divisionId())
            .orElseThrow(() -> new SportingConflictException("classification-conflict", List.of()));
  }

  /**
   * Refuses a newly assigned inactive division while removals preserve published state.
   *
   * @param division locked target, or null
   * @param pools authorized affected scopes
   * @throws SportingConflictException if the target is inactive
   */
  private void requireActive(DivisionView division, List<UUID> pools) {
    if (division != null && !division.active())
      throw new SportingConflictException("classification-conflict", pools);
  }

  /**
   * Requires the same current grant for reads and commands before revealing resource state.
   *
   * @param accountId original local account
   * @throws AccessDeniedException if the classification grant is absent
   */
  private void requireRead(UUID accountId) {
    if (!permissions.forAccount(accountId).contains(Permission.MANAGE_SPORTING_CLASSIFICATION))
      throw new AccessDeniedException("Classification is not permitted");
  }

  /**
   * Checks stale revisions before accepting even an otherwise matching no-op.
   *
   * @param supplied client revision from this resource
   * @param current current opaque editing revision
   * @throws SportingConflictException if the revisions differ
   */
  private void requireRevision(String supplied, String current) {
    if (!current.equals(supplied)) throw new SportingConflictException("stale-revision", List.of());
  }

  /**
   * Projects the pack's own complete setting.
   *
   * @param pack current default owner
   * @return local and effective settings with its managed version
   */
  private ClassificationView detail(PackView pack) {
    return new ClassificationView(
        pack.id(), Long.toString(pack.revision()), pack.setting(), pack.setting());
  }

  /**
   * Includes the inherited owner's version only while this pool actually inherits.
   *
   * @param pool current local editor state
   * @param pack owning inheritance source
   * @return a revision invalidated by any relevant local or inherited change
   */
  private ClassificationView detail(PoolClassificationView pool, PackView pack) {
    String revision = Long.toString(pool.revision());
    if (pool.setting() == null) revision += ":" + pack.revision();
    return new ClassificationView(
        pool.pool().id(),
        revision,
        pool.setting(),
        pool.setting() == null ? pack.setting() : pool.setting());
  }

  /**
   * Loads one coherent pool editor response within the caller transaction.
   *
   * @param poolId current pool identity
   * @return local setting and applicable inheritance
   */
  private ClassificationView poolDetail(UUID poolId) {
    PoolClassificationView pool =
        store.poolClassification(poolId).orElseThrow(SportingResourceNotFoundException::new);
    return detail(pool, store.pack(pool.pool().packId()).orElseThrow());
  }
}
