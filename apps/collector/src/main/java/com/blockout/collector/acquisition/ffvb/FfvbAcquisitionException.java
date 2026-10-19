package com.blockout.collector.acquisition.ffvb;

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
}
