package com.blockout.backend.accounts.domain;

import java.time.Instant;
import java.util.UUID;

/**
 * Immutable account lifecycle and minimal profile, independent of provider and persistence APIs.
 *
 * @param id business UUID for this lifecycle, never redirected to a replacement account
 * @param issuer exact validated issuer
 * @param subject exact validated subject
 * @param username current user-controlled presentation
 * @param email last usable provider email, never an identity key
 * @param principalCreatedAt trustworthy provider creation instant, or null when unknown
 */
public record Account(
    UUID id,
    String issuer,
    String subject,
    String username,
    String email,
    Instant principalCreatedAt) {

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

  /**
   * Incorporates available principal evidence without clearing known data or changing the profile.
   *
   * @param availableEmail usable provider email, or null/blank when unavailable
   * @param availableCreatedAt trustworthy principal creation instant, or null when unavailable
   * @return the same lifecycle with only available provider evidence replaced
   */
  public Account withPrincipalEvidence(String availableEmail, Instant availableCreatedAt) {
    return new Account(
        id,
        issuer,
        subject,
        username,
        availableEmail == null || availableEmail.isBlank() ? email : availableEmail,
        availableCreatedAt == null ? principalCreatedAt : availableCreatedAt);
  }
}
