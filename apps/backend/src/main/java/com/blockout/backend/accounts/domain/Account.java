package com.blockout.backend.accounts.domain;

import java.util.UUID;

/**
 * Immutable account lifecycle and minimal profile, independent of provider and persistence APIs.
 *
 * @param id business UUID for this lifecycle, never redirected to a replacement account
 * @param issuer exact validated issuer
 * @param subject exact validated subject
 * @param username current user-controlled presentation
 * @param email last usable provider email, never an identity key
 */
public record Account(UUID id, String issuer, String subject, String username, String email) {

  /**
   * Matches the validated principal exactly, without email matching or replacement resolution.
   *
   * @param callerIssuer validated issuer
   * @param callerSubject validated subject
   * @return whether this lifecycle belongs to that exact principal
   */
  public boolean belongsTo(String callerIssuer, String callerSubject) {
    return issuer.equals(callerIssuer) && subject.equals(callerSubject);
  }
}
