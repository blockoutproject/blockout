package com.blockout.backend.access.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Independent global action grants; ordinary eligibility remains with each business owner. */
@Getter
@RequiredArgsConstructor
public enum Permission {
  MANAGE_MAINTENANCE("maintenance.manage"),
  MANAGE_APPLICATION_VERSIONS("application-versions.manage"),
  BYPASS_MAINTENANCE("maintenance.bypass"),
  MANAGE_SPORTING_PRESENTATION("sporting-presentation.manage"),
  MANAGE_SPORTING_CLASSIFICATION("sporting-classification.manage"),
  MANAGE_DIVISION_LIFECYCLE("division-lifecycle.manage"),
  MANAGE_COLLECTION("collection.manage"),
  MODERATE_STREAM_LINKS("stream-links.moderate");

  private final String value;
}
