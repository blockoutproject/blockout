package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.accounts.application.exception.ProviderEmailUnavailableException;
import com.blockout.backend.accounts.domain.Account;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/** Captures a lifecycle, reads provider evidence outside SQL, then commits only that lifecycle. */
@Service
@RequiredArgsConstructor
public class EstablishAccount {
  private final AccountStore accounts;
  private final PrincipalReader provider;
  private final PlatformTransactionManager transactions;

  /**
   * Establishes the exact validated principal after explicit login or targeted retry. Each native
   * uniqueness refusal rolls back before a new neutral candidate or the concurrent winner is read.
   *
   * @param issuer exact validated issuer
   * @param subject exact validated subject
   * @return committed account and creation outcome
   * @throws ProviderEmailUnavailableException when creation lacks a usable provider address
   * @throws AccountUnavailableException for unavailable evidence or an erased original UUID
   */
  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  public Outcome establish(String issuer, String subject) {
    return establish(issuer, subject, null);
  }

  /**
   * Establishes only the existing lifecycle admitted by personal maintenance bypass. Its erasure or
   * replacement before capture refuses the request before provider I/O; it never becomes creation.
   *
   * @param issuer exact validated issuer
   * @param subject exact validated subject
   * @param admittedAccount original non-null business UUID authorized at admission
   * @return committed existing account with current evidence
   * @throws AccountUnavailableException if that original disappears or is replaced
   */
  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  public Outcome establishExisting(String issuer, String subject, UUID admittedAccount) {
    return establish(issuer, subject, Objects.requireNonNull(admittedAccount));
  }

  /**
   * Captures the account once, retaining any admission constraint through the existing commit path.
   *
   * @param issuer exact validated issuer
   * @param subject exact validated subject
   * @param admittedAccount required bypass lifecycle, or null for ordinary explicit establishment
   * @return locally committed account and creation outcome
   * @throws AccountUnavailableException when an admitted original is absent or replaced
   * @throws ProviderEmailUnavailableException when unconstrained creation lacks a usable address
   */
  private Outcome establish(String issuer, String subject, UUID admittedAccount) {
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    Optional<UUID> original =
        transaction.execute(status -> accounts.findIdByPrincipal(issuer, subject));
    if (admittedAccount != null && original.filter(admittedAccount::equals).isEmpty()) {
      throw new AccountUnavailableException();
    }
    PrincipalReader.Evidence evidence;
    boolean unavailable = false;
    try {
      evidence = provider.read(issuer, subject);
    } catch (AccountUnavailableException failure) {
      evidence = new PrincipalReader.Evidence(null, null, List.of());
      unavailable = true;
    }
    PrincipalReader.Evidence available = evidence;
    boolean providerUnavailable = unavailable;
    for (int attempt = 0; attempt < 5; attempt++) {
      try {
        return transaction.execute(
            status -> commit(issuer, subject, original, available, providerUnavailable));
      } catch (DataIntegrityViolationException failure) {
        if (!isEstablishmentCollision(failure)) throw failure;
      }
    }
    throw new AccountUnavailableException();
  }

  /**
   * Rechecks the captured identity under the write transaction; a lost original never becomes
   * creation. Only the identity is read before synchronization loads the current profile under its
   * row lock, so a concurrent winner's profile cannot become stale managed state.
   *
   * @param issuer validated issuer
   * @param subject validated subject
   * @param original lifecycle identity observed before provider I/O
   * @param evidence available minimal evidence
   * @param providerUnavailable distinguishes provider failure from a successful read without email
   * @return locally committed outcome
   * @throws AccountUnavailableException when the captured original has disappeared
   * @throws ProviderEmailUnavailableException when creation lacks usable provider email
   */
  private Outcome commit(
      String issuer,
      String subject,
      Optional<UUID> original,
      PrincipalReader.Evidence evidence,
      boolean providerUnavailable) {
    Optional<UUID> current =
        original.isPresent() ? original : accounts.findIdByPrincipal(issuer, subject);
    if (current.isPresent()) {
      Account account =
          accounts
              .synchronize(current.orElseThrow(), evidence.email(), evidence.createdAt())
              .orElseThrow(() -> new AccountUnavailableException());
      return new Outcome(account, false);
    }
    if (providerUnavailable) throw new AccountUnavailableException();
    if (evidence.email() == null || evidence.email().isBlank())
      throw new ProviderEmailUnavailableException();
    String username = "Player_" + UUID.randomUUID().toString().replace("-", "").substring(0, 24);
    return new Outcome(
        accounts.create(issuer, subject, username, evidence.email(), evidence.createdAt()), true);
  }

  /**
   * Retries only the two named account uniqueness races after transaction rollback.
   *
   * @param failure translated database refusal
   * @return whether another principal read/new neutral candidate can settle this race
   */
  private static boolean isEstablishmentCollision(DataIntegrityViolationException failure) {
    for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
      if (cause instanceof ConstraintViolationException constraint) {
        return "uk_account_principal".equals(constraint.getConstraintName())
            || "uk_account_username".equals(constraint.getConstraintName());
      }
    }
    return false;
  }

  /**
   * Committed establishment result; the business UUID identifies only this account lifecycle.
   *
   * @param account usable account with known evidence preserved
   * @param created whether this request created it
   */
  public record Outcome(Account account, boolean created) {}
}
