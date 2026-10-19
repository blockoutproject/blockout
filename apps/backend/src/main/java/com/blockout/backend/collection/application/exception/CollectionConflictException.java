package com.blockout.backend.collection.application.exception;

import lombok.Getter;

/** Safe rejection of stale configuration or a context that cannot authorize acquisition. */
@Getter
public class CollectionConflictException extends RuntimeException {
  private final String type;

  /**
   * Carries only the canonical problem suffix, never provider data.
   *
   * @param type canonical stale-revision or invalid-cycle-context reason
   */
  public CollectionConflictException(String type) {
    super("Collection operation conflicts with current state");
    this.type = type;
  }
}
