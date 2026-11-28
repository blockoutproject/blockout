package com.blockout.backend.sporting.application.exception;

/**
 * Refuses one unassociable item without guessing a replacement or changing its retained identity.
 */
public class UnresolvedSportingIdentityException extends RuntimeException {
  /**
   * Carries a bounded technical reason, never a raw provider record.
   *
   * @param reason safe identity refusal
   */
  public UnresolvedSportingIdentityException(String reason) {
    super(reason);
  }
}
