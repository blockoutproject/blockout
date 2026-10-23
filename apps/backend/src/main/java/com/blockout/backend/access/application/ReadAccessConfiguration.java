package com.blockout.backend.access.application;

import com.blockout.backend.access.domain.ApplicationVersionSettings;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.access.domain.Permission;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Current settings reads; public content visibility is decided only at the API projection. */
@Service
@RequiredArgsConstructor
public class ReadAccessConfiguration {
  private final AccessSettingsStore store;
  private final ActionAuthorization authorization;

  /** Complete coherent stored groups; this internal value never establishes mobile admission. */
  public record Snapshot(MaintenanceSettings maintenance, ApplicationVersionSettings versions) {}

  /** Reads both groups in one statement, without identity, caching or permissive fallback. */
  @Transactional(readOnly = true)
  public Snapshot read() {
    return store.readComplete();
  }

  /**
   * Checks the current grant under the original account lock before exposing prepared content.
   *
   * @param account original business UUID; no replacement principal is resolved under the lock
   * @return the complete authorized stored group
   */
  @Transactional
  public MaintenanceSettings maintenance(UUID account) {
    authorization.require(account, Permission.MANAGE_MAINTENANCE);
    return store.maintenance();
  }

  /**
   * Checks the independent current versions grant before exposing its settings.
   *
   * @param account original business UUID
   * @return both authorized platforms and their shared revision/message
   */
  @Transactional
  public ApplicationVersionSettings versions(UUID account) {
    authorization.require(account, Permission.MANAGE_APPLICATION_VERSIONS);
    return store.versions();
  }
}
