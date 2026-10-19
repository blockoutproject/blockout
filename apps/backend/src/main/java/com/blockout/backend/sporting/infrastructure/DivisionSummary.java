package com.blockout.backend.sporting.infrastructure;

import java.util.UUID;

/** Native query projection for division lists, carrying image presence without loading bytes. */
interface DivisionSummary {
  UUID getId();

  long getRevision();

  String getName();

  String getColor();

  String getGradientStart();

  String getGradientMiddle();

  String getGradientEnd();

  boolean getHasLogo();

  boolean isActive();
}
