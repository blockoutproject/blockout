package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.domain.Account;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Account identity, original ownership and erasure coordination. */
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
   * Locks the original lifecycle through the caller's write transaction and checks its exact
   * holder. Absence and a different holder produce the same refusal.
   *
   * @param issuer validated caller issuer
   * @param subject validated caller subject
   * @param id original business UUID
   * @return the locked account
   * @throws AccountNotFoundException when the original is absent or belongs to another principal
   */
  @Transactional(propagation = Propagation.MANDATORY)
  Account lockOwnedOriginal(String issuer, String subject, UUID id) {
    return accounts
        .lockById(id)
        .filter(account -> account.belongsTo(issuer, subject))
        .orElseThrow(AccountNotFoundException::new);
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
