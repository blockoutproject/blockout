package com.blockout.backend.support.application;

import lombok.Getter;

/**
 * Safe failure classification; original causes stay internal and are never rendered as diagnostics.
 */
@Getter
public final class SupportUnavailableException extends RuntimeException {
  private final Stage stage;
  private final Reason reason;

  /** Stages of this single send, without private request, case or attachment identifiers. */
  public enum Stage {
    CONFIGURATION,
    INPUT,
    CREATE,
    ATTACH,
    COMPLETE,
    SIGNAL
  }

  /** Bounded operational reasons, independent of provider messages and submitted content. */
  public enum Reason {
    UNCONFIGURED,
    REFUSED,
    UNCONFIRMED,
    IO,
    PROCESS_FAILED,
    TIMEOUT,
    INTERRUPTED,
    TERMINATION_FAILED
  }

  /**
   * Creates a classification without provider data.
   *
   * @param stage failed send stage
   * @param reason bounded failure reason
   */
  public SupportUnavailableException(Stage stage, Reason reason) {
    this(stage, reason, null);
  }

  /**
   * Retains an internal cause without incorporating its message into the public exception text.
   *
   * @param stage failed send stage
   * @param reason bounded failure reason
   * @param cause internal failure, never rendered by the support diagnostic owner
   */
  public SupportUnavailableException(Stage stage, Reason reason, Throwable cause) {
    super("Support receipt could not be confirmed", cause);
    this.stage = stage;
    this.reason = reason;
  }
}
