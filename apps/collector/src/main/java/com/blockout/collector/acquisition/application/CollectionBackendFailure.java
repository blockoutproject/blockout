package com.blockout.collector.acquisition.application;

import lombok.Getter;

/**
 * Safe transport classification; raw HTTP bodies and credentials never become operational messages.
 */
@Getter
public class CollectionBackendFailure extends RuntimeException {
  /** Only uncertainty permits a confirmation read; it never permits a repeated mutation. */
  public enum Kind {
    CONFLICT,
    NOT_FOUND,
    REJECTED,
    UNCONFIRMED
  }

  private final Kind kind;

  /**
   * Preserves the boundary failure classification without exposing submitted values.
   *
   * @param kind owned failure category
   * @param cause original failure retained internally; do not render its provider body in logs
   */
  public CollectionBackendFailure(Kind kind, Throwable cause) {
    super("Collector backend operation was not confirmed", cause);
    this.kind = kind;
  }
}
