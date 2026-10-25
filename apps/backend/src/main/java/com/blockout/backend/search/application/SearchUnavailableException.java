package com.blockout.backend.search.application;

/** Safe retryable search failure; raw engine and query payloads never reach HTTP diagnostics. */
public class SearchUnavailableException extends RuntimeException {
  /** Creates a dependency/evaluation failure without retaining provider payloads. */
  public SearchUnavailableException() {
    super("Search is unavailable");
  }

  /**
   * Retains the technical cause internally; HTTP and diagnostics emit only the safe failure
   * profile.
   *
   * @param cause original dependency failure, never rendered as an engine/query payload
   */
  public SearchUnavailableException(Throwable cause) {
    super("Search is unavailable", cause);
  }
}
