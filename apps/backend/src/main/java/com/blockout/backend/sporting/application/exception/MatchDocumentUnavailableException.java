package com.blockout.backend.sporting.application.exception;

/** Safe ordinary supplier failure, distinct from missing current eligibility. */
public class MatchDocumentUnavailableException extends RuntimeException {
  /** Creates an opaque failure without copying supplier bodies or locators. */
  public MatchDocumentUnavailableException() {
    this(null);
  }

  /**
   * Retains a technical cause internally; public translation and logs never render its payload.
   *
   * @param cause supplier/transport failure, or null for an ordinary validation refusal
   */
  public MatchDocumentUnavailableException(Throwable cause) {
    super("Match document unavailable", cause);
  }
}
