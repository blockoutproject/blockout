package com.blockout.backend.access.application;

import com.blockout.backend.access.domain.ApplicationVersionSettings;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.access.domain.Permission;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Current settings reads; public content visibility is decided only at the API projection. */
@Service
@RequiredArgsConstructor
public class ReadAccessConfiguration {
  private final AccessSettingsStore store;
  private final CurrentPermissions permissions;

  /** Complete coherent stored groups; this internal value never establishes mobile admission. */
  public record Snapshot(MaintenanceSettings maintenance, ApplicationVersionSettings versions) {}

  /** Reads both groups in one statement, without identity, caching or permissive fallback. */
  @Transactional(readOnly = true)
  public Snapshot read() {
    return store.readComplete();
  }

  /**
   * Checks the current read grant before exposing prepared content, without locking the account.
   *
   * @param account original business UUID; no replacement principal is resolved
   * @return the complete authorized stored group
   * @throws AccessDeniedException if the current grant is absent
   */
  @Transactional(readOnly = true)
  public MaintenanceSettings maintenance(UUID account) {
    permissions.requireForRead(account, Permission.MANAGE_MAINTENANCE);
    return store.maintenance();
  }

  /**
   * Checks the independent current versions grant before exposing its settings.
   *
   * @param account original business UUID
   * @return both authorized platforms and their shared revision/message
   * @throws AccessDeniedException if the current grant is absent
   */
  @Transactional(readOnly = true)
  public ApplicationVersionSettings versions(UUID account) {
    permissions.requireForRead(account, Permission.MANAGE_APPLICATION_VERSIONS);
    return store.versions();
  }
}
