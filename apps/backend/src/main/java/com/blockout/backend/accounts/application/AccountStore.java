package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.domain.Account;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Account-owned persistence operations; mutations and locks participate in the caller's
 * transaction.
 */
public interface AccountStore {
  /**
   * Reads the current mapping without creating an account or consulting a provider.
   *
   * @param issuer exact validated issuer
   * @param subject exact validated subject
   * @return the current account, if established
   */
  Optional<Account> findByPrincipal(String issuer, String subject);

  /**
   * Reads an original lifecycle without resolving a later replacement through its principal.
   *
   * @param id original business UUID
   * @return the original account, or empty after erasure
   */
  Optional<Account> findById(UUID id);

  /**
   * Locks the original account until the caller's transaction completes. Acquire any domain root
   * locks first; acquire multiple account locks in UUID order.
   *
   * @param id original business UUID
   * @return the locked account, or empty after erasure
   */
  Optional<Account> lockById(UUID id);

  /**
   * Inserts a new lifecycle. PostgreSQL enforces principal and case-insensitive username
   * uniqueness; the caller handles a rejected competing creation after its transaction rolls back.
   *
   * @param issuer exact validated issuer
   * @param subject exact validated subject
   * @param username neutral candidate, trimmed before native validation
   * @param email usable required provider email
   * @param principalCreatedAt trustworthy provider creation instant, or null
   * @return the new account with its generated business UUID
   */
  Account create(
      String issuer, String subject, String username, String email, Instant principalCreatedAt);

  /**
   * Locks and synchronizes only the captured lifecycle. Absence never becomes creation or an update
   * to a replacement. Provider retrieval must have completed before the caller's transaction.
   *
   * @param id captured original business UUID
   * @param email usable provider email, or null/blank when unavailable
   * @param principalCreatedAt trustworthy provider instant, or null when unavailable
   * @return updated account, or empty if the original lifecycle was erased
   */
  Optional<Account> synchronize(UUID id, String email, Instant principalCreatedAt);
}
