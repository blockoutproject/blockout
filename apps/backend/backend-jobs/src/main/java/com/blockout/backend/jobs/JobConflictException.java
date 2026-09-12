package com.blockout.backend.jobs;

/** A producer reused a durable key for different content. */
public final class JobConflictException extends RuntimeException {
  public JobConflictException() {
    super("Job key already identifies different content");
  }
}
