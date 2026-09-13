package com.blockout.backend.jobs.application;

/** Persisted queue lifecycle exposed to owners without leaking queue SQL. */
public enum JobState {
  PENDING,
  RUNNING,
  SUCCEEDED,
  DEAD
}
