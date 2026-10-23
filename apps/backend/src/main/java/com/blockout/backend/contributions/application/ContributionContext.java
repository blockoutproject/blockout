package com.blockout.backend.contributions.application;

import java.util.Objects;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;

/**
 * Current original-account projection for a single admitted contribution request. It grants no
 * sporting eligibility, ownership of a version, ordinary capability or maintenance bypass. Mutation
 * owners must recheck the original account and current grants under their ordered locks; retaining
 * this read projection never authorizes later effects.
 *
 * @param accountId currently usable original F05 business lifecycle
 * @param moderateStreamLinks current F12 stream-links.moderate projection, covering all video
 *     actions
 */
public record ContributionContext(UUID accountId, boolean moderateStreamLinks) {
  /**
   * Requires a usable identity rather than representing a guest as an ordinary contributor.
   *
   * @param accountId established original business UUID, never a provider identity or replacement
   * @param moderateStreamLinks exact current video capability; no entitlement condition
   */
  public ContributionContext {
    Objects.requireNonNull(accountId);
  }

  /**
   * Rejects an intent captured for another or erased/recreated business lifecycle.
   *
   * @param originalAccountId original owner path or moderator command identity
   * @throws AccessDeniedException if it is not the currently usable lifecycle
   */
  public void requireOriginalAccount(UUID originalAccountId) {
    if (!accountId.equals(originalAccountId))
      throw new AccessDeniedException("Action is not permitted");
  }

  /**
   * Requires the one complete video capability for reads, publication, replacement and decisions.
   *
   * @throws AccessDeniedException if current stream moderation is absent
   */
  public void requireModeration() {
    if (!moderateStreamLinks) throw new AccessDeniedException("Action is not permitted");
  }
}
