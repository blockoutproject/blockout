package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.domain.Account;
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
    return accounts.findByPrincipal(issuer, subject).map(Account::id);
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
}
