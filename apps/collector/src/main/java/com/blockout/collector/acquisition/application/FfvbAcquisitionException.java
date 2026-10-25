package com.blockout.collector.acquisition.application;

import lombok.Getter;

/** Safe scope-level refusal; original provider bodies are deliberately excluded. */
public class FfvbAcquisitionException extends RuntimeException {
  /** Actual boundary that failed; transport wrapping must not imply a structural defect. */
  public enum Kind {
    STRUCTURE,
    TRANSPORT
  }

  @Getter private final Kind kind;

  /**
   * Rejects unreadable or contradictory provider context with a fixed safe diagnostic.
   *
   * @param reason fixed diagnostic chosen by the interpreter, never original source text
   */
  public FfvbAcquisitionException(String reason) {
    super(reason);
    this.kind = Kind.STRUCTURE;
  }

  /**
   * Retains an interpreter failure cause while exposing only its fixed safe diagnostic.
   *
   * @param message fixed diagnostic or native status/type, never provider content
   * @param cause original internal failure, never rendered in operational logs
   */
  public FfvbAcquisitionException(String message, Throwable cause) {
    this(message, cause, Kind.STRUCTURE);
  }

  /**
   * Distinguishes a wrapped native transport failure from a source-interpretation refusal.
   *
   * @param message fixed diagnostic or native status/type, never provider content
   * @param cause original internal failure, never rendered in operational logs
   * @param kind actual failed boundary
   */
  public FfvbAcquisitionException(String message, Throwable cause, Kind kind) {
    super(message, cause);
    this.kind = kind;
  }
}
