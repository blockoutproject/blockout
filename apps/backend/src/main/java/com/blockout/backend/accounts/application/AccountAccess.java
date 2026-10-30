package com.blockout.backend.accounts.application;

import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Narrow account identity and erasure-coordination boundary for other business owners. */
@Service
@RequiredArgsConstructor
public class AccountAccess {
  private final AccountStore accounts;

  /**
   * Resolves a validated principal locally without exposing personal profile data.
   *
   * @param issuer exact validated issuer
   * @param subject exact validated subject
   * @return the currently established business UUID, if any
   */
  @Transactional(readOnly = true)
  public Optional<UUID> currentId(String issuer, String subject) {
    return accounts.findIdByPrincipal(issuer, subject);
  }

  /**
   * Holds the original account lock through the caller's business transaction. The caller must
   * reject absence and check its own current permissions before effects. Lock domain roots first
   * and multiple accounts in UUID order; never acquire a domain root afterward.
   *
   * @param id original business UUID
   * @return whether the original lifecycle still exists under the acquired lock
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public boolean lock(UUID id) {
    return accounts.lockById(id).isPresent();
  }

  /**
   * Supplies retained reliable age evidence locally; performs no provider request.
   *
   * @param id original account, already checked by the caller when writing
   * @return provider creation instant, or null when evidence is unknown
   */
  @Transactional(readOnly = true)
  public java.time.Instant principalCreatedAt(UUID id) {
    return accounts
        .findById(id)
        .map(com.blockout.backend.accounts.domain.Account::principalCreatedAt)
        .orElse(null);
  }

  /**
   * Supplies current permitted attribution for one contribution response.
   *
   * @param id original lifecycle
   * @return current name, or null after erasure
   */
  @Transactional(readOnly = true)
  public String displayName(UUID id) {
    return accounts
        .findById(id)
        .map(com.blockout.backend.accounts.domain.Account::username)
        .orElse(null);
  }

  /**
   * Supplies current names for an authorized private page without per-version lookups.
   *
   * @param ids original owner/decision identities from a bounded version selection
   * @return present lifecycle names; erased attribution is omitted
   */
  @Transactional(readOnly = true)
  public java.util.Map<UUID, String> displayNames(java.util.Set<UUID> ids) {
    return accounts.displayNames(ids);
  }

  /**
   * Checks only original lifecycle presence; never establishes or resolves a replacement account.
   *
   * @param id original UUID
   * @return whether this lifecycle still exists
   */
  @Transactional(readOnly = true)
  public boolean exists(UUID id) {
    return accounts.findById(id).isPresent();
  }
}
