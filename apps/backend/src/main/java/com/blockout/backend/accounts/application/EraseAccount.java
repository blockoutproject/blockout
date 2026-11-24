package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.contributions.application.RedactContributionReports;
import com.blockout.backend.following.application.EraseAccountFollows;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/** Commits original-account personal erasure before bounded, independent provider attempts. */
@Service
@RequiredArgsConstructor
public class EraseAccount {
  private final AccountStore accounts;
  private final AccountAccess access;
  private final EraseAccountFollows follows;
  private final RedactContributionReports reports;
  private final PlatformTransactionManager transactions;
  private final OriginalTargetCleanup cleanup;

  /**
   * Locks only the original account and commits local erasure before calling providers. An
   * absent/foreign original never resolves a replacement or replays provider effects.
   *
   * @param issuer validated caller issuer
   * @param subject validated caller subject
   * @param accountId original business UUID
   * @throws AccountNotFoundException for an absent original or another holder
   */
  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  public void erase(String issuer, String subject, UUID accountId) {
    OriginalAccountTargets targets =
        new TransactionTemplate(transactions)
            .execute(
                status -> {
                  Account original = access.lockOwnedOriginal(issuer, subject, accountId);
                  follows.erase(accountId);
                  reports.redact(accountId);
                  String photoKey = accounts.erase(accountId);
                  // The V2 business UUID is this schema's established RevenueCat reference.
                  return new OriginalAccountTargets(
                      original.id(),
                      original.issuer(),
                      original.subject(),
                      List.of(original.id().toString()),
                      photoKey);
                });
    cleanup.clean(targets);
  }
}
