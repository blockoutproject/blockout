package com.blockout.collector.acquisition.application;

/** Safe scope-level refusal; original provider bodies are deliberately excluded. */
public class FfvbAcquisitionException extends RuntimeException {
  /**
   * Rejects unreadable or contradictory provider context with a fixed safe diagnostic.
   *
   * @param reason fixed diagnostic chosen by the interpreter, never original source text
   */
  public FfvbAcquisitionException(String reason) {
    super(reason);
  }

  /**
   * Retains the internal transport cause while exposing only the adapter's safe diagnostic.
   *
   * @param message fixed diagnostic or native status/type, never provider content
   * @param cause original internal failure, never rendered in operational logs
   */
  public FfvbAcquisitionException(String message, Throwable cause) {
    super(message, cause);
  }
}
