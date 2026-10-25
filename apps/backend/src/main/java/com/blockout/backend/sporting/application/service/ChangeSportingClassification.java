package com.blockout.backend.sporting.application.service;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.ClassificationView;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
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
public class ChangeSportingClassification {
  private final SportingStore store;
  private final CurrentPermissions permissions;
  private final ActionAuthorization authorization;

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
    permissions.requireForRead(accountId, Permission.MANAGE_SPORTING_CLASSIFICATION);
    store.lockPackSeason(packId);
    PackView pack = store.pack(packId).orElseThrow(SportingResourceNotFoundException::new);
    DivisionDetail division = lockDivision(setting);
    authorization.require(accountId, Permission.MANAGE_SPORTING_CLASSIFICATION);
    SportingEditRevision.require(revision, ClassificationView.from(pack).revision());
    if (Objects.equals(setting, pack.setting())) return ClassificationView.from(pack);
    List<UUID> pools =
        store.packPools(packId).stream()
            .filter(pool -> pool.setting() == null)
            .map(pool -> pool.pool().id())
            .toList();
    requireActive(division, pools);
    correct(pools, setting);
    store.setPackClassification(packId, setting);
    return ClassificationView.from(store.pack(packId).orElseThrow());
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
    permissions.requireForRead(accountId, Permission.MANAGE_SPORTING_CLASSIFICATION);
    // Resolve only an immutable season reference before loading mutable editor state.
    store.lockPoolSeason(poolId);
    PoolClassificationView pool = store.poolClassification(poolId).orElseThrow();
    PackView pack = store.pack(pool.pool().packId()).orElseThrow();
    SportingClassification effective = setting == null ? pack.setting() : setting;
    DivisionDetail division = lockDivision(effective);
    authorization.require(accountId, Permission.MANAGE_SPORTING_CLASSIFICATION);
    SportingEditRevision.require(revision, ClassificationView.from(pool, pack).revision());
    if (Objects.equals(setting, pool.setting())) return ClassificationView.from(pool, pack);
    requireActive(division, List.of(poolId));
    correct(List.of(poolId), effective);
    store.setPoolClassification(poolId, setting);
    PoolClassificationView updated = store.poolClassification(poolId).orElseThrow();
    return ClassificationView.from(updated, store.pack(updated.pool().packId()).orElseThrow());
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
  private DivisionDetail lockDivision(SportingClassification classification) {
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
  private void requireActive(DivisionDetail division, List<UUID> pools) {
    if (division != null && !division.active())
      throw new SportingConflictException("classification-conflict", pools);
  }
}
