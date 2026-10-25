package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.AccountCreationConflictException;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.accounts.application.exception.ProviderEmailUnavailableException;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.accounts.domain.AccountUsername;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
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
  private final ReadAccount reads;
  private final PlatformTransactionManager transactions;

  /**
   * Establishes the exact validated principal after explicit login or targeted retry. Each native
   * uniqueness refusal rolls back before a new neutral candidate or the concurrent winner is read.
   *
   * @param issuer exact validated issuer
   * @param subject exact validated subject
   * @return current original-account projection after commit and creation outcome
   * @throws ProviderEmailUnavailableException when creation lacks a usable provider address
   * @throws AccountUnavailableException for unavailable evidence or an erased original UUID
   */
  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  public Outcome establish(String issuer, String subject) {
    return establish(issuer, subject, null);
  }

  /**
   * Establishes the admitted principal while retaining any personal bypass lifecycle. Erasure or
   * replacement of that lifecycle before capture refuses the request before provider I/O; it never
   * becomes creation.
   *
   * @param context validated principal and optional original lifecycle admitted by F12
   * @return current original-account projection after its evidence commit and creation outcome
   * @throws AccountUnavailableException if an admitted original disappears or is replaced
   * @throws ProviderEmailUnavailableException when ordinary creation lacks a usable address
   */
  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  public Outcome establish(AccountContext context) {
    return establish(context.issuer(), context.subject(), context.admittedAccount().orElse(null));
  }

  /**
   * Captures the account once, retaining any admission constraint through the existing commit path.
   *
   * @param issuer exact validated issuer
   * @param subject exact validated subject
   * @param admittedAccount required bypass lifecycle, or null for ordinary explicit establishment
   * @return current original-account projection after commit and creation outcome
   * @throws AccountUnavailableException when an admitted original is absent or replaced
   * @throws ProviderEmailUnavailableException when unconstrained creation lacks a usable address
   */
  private Outcome establish(String issuer, String subject, UUID admittedAccount) {
    TransactionTemplate capture = new TransactionTemplate(transactions);
    capture.setReadOnly(true);
    Optional<UUID> original =
        capture.execute(status -> accounts.findIdByPrincipal(issuer, subject));
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
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    for (int attempt = 0; attempt < 5; attempt++) {
      try {
        Committed committed =
            transaction.execute(
                status -> commit(issuer, subject, original, available, providerUnavailable));
        return outcome(issuer, subject, committed);
      } catch (AccountCreationConflictException conflict) {
        // The failed insert transaction has rolled back before another candidate is considered.
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
  private Committed commit(
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
      return new Committed(account.id(), false);
    }
    if (providerUnavailable) throw new AccountUnavailableException();
    if (evidence.email() == null || evidence.email().isBlank())
      throw new ProviderEmailUnavailableException();
    Account account =
        accounts.create(
            issuer, subject, AccountUsername.neutral(), evidence.email(), evidence.createdAt());
    return new Committed(account.id(), true);
  }

  /**
   * Reloads only the committed lifecycle for the final response; erasure never announces a usable
   * account or redirects the result to a replacement created for the same principal.
   *
   * @param issuer validated issuer
   * @param subject validated subject
   * @param committed completed local creation or synchronization
   * @return current local profile, photo presence and permissions after commit
   * @throws AccountUnavailableException when the original disappears before result projection
   */
  private Outcome outcome(String issuer, String subject, Committed committed) {
    try {
      return new Outcome(
          reads.original(issuer, subject, committed.accountId()), committed.created());
    } catch (AccountNotFoundException absent) {
      throw new AccountUnavailableException();
    }
  }

  /**
   * Current presentation of a committed establishment, retaining only its original lifecycle.
   *
   * @param view current usable account, accepted-photo presence and independent grants
   * @param created whether this request created it
   */
  public record Outcome(ReadAccount.View view, boolean created) {}

  /**
   * Minimal local commit fact retained while the original lifecycle is projected for response.
   *
   * @param accountId original business UUID
   * @param created whether the committed transaction created it
   */
  private record Committed(UUID accountId, boolean created) {}
}
