package com.blockout.backend.jobs;

/** Owner-declared permanent rejection; the safe code is the only persisted diagnostic. */
public final class JobRejectedException extends RuntimeException {
  private final String code;

  public JobRejectedException(String code) {
    super("Job content rejected");
    if (code == null || !code.matches("[A-Z][A-Z0-9_]{0,99}"))
      throw new IllegalArgumentException("Invalid rejection code");
    this.code = code;
  }

  public String code() {
    return code;
  }
}
