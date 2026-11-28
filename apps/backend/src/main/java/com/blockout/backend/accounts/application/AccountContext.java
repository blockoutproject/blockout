package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import java.util.Optional;
import java.util.UUID;

/**
 * Validated principal and optional lifecycle admitted by current personal maintenance bypass.
 *
 * @param issuer exact validated issuer, never an email-based identity
 * @param subject exact validated subject
 * @param admittedAccount the original lifecycle admitted by active bypass, or empty otherwise
 */
public record AccountContext(String issuer, String subject, Optional<UUID> admittedAccount) {
  /**
   * Keeps personal bypass attached to the original lifecycle rather than a replacement resource.
   *
   * @param original business UUID addressed by the operation
   * @throws AccountNotFoundException when bypass admitted a different lifecycle
   */
  public void requireOriginalAccount(UUID original) {
    if (admittedAccount.filter(id -> !original.equals(id)).isPresent()) {
      throw new AccountNotFoundException();
    }
  }
}
