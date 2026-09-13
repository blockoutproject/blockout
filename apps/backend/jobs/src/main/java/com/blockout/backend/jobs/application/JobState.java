package com.blockout.backend.jobs.application;

import java.util.Locale;

/** Persisted queue lifecycle shared by repositories and worker metrics. */
public enum JobState {
  PENDING,
  RUNNING,
  SUCCEEDED,
  DEAD;

  /** Returns the stable lowercase value used by SQL and metric labels. */
  public String value() {
    return name().toLowerCase(Locale.ROOT);
  }
}
