package com.blockout.backend.access.domain;

import lombok.Getter;

/** Carries the active maintenance observed when ordinary account admission was refused. */
@Getter
public class MaintenanceRequiredException extends RuntimeException {
  private final MaintenanceSettings maintenance;

  /**
   * Retains the published restriction without credentials or provider diagnostics.
   *
   * @param maintenance current active maintenance that refused the request
   */
  public MaintenanceRequiredException(MaintenanceSettings maintenance) {
    this.maintenance = maintenance;
  }
}
