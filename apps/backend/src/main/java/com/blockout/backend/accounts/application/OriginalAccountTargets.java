package com.blockout.backend.accounts.application;

import java.util.List;
import java.util.UUID;

/**
 * Immutable original-lifecycle references captured before local deletion; never resolved by email.
 * Historical references are included only when already established by the continuity owner.
 *
 * @param accountId original business lifecycle
 * @param issuer exact original Auth0 issuer
 * @param subject exact original Auth0 subject
 * @param revenueCatIds known original current/historical customer IDs, never guessed aliases
 */
public record OriginalAccountTargets(
    UUID accountId, String issuer, String subject, List<String> revenueCatIds) {
  /**
   * Copies known references so post-commit work cannot observe a changed target collection.
   *
   * @param accountId original business lifecycle
   * @param issuer exact original issuer
   * @param subject exact original principal
   * @param revenueCatIds established references, possibly empty
   */
  public OriginalAccountTargets {
    revenueCatIds = List.copyOf(revenueCatIds);
  }
}
