package com.blockout.backend.accounts.application;

import com.blockout.backend.access.application.EraseAccountGrants;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.contributions.application.EraseContributionAttribution;
import com.blockout.backend.following.application.EraseAccountFollows;
import com.blockout.backend.notifications.application.EraseAccountNotifications;
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
  private final EraseAccountFollows follows;
  private final EraseAccountNotifications notifications;
  private final EraseContributionAttribution contributions;
  private final EraseAccountGrants grants;
  private final PlatformTransactionManager transactions;
  private final OriginalTargetCleanup cleanup;

  /**
   * Locks only the original account, clears all real local owners atomically, then calls providers.
   * An absent/foreign original never resolves a replacement or replays provider effects.
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
                  Account original =
                      accounts
                          .lockById(accountId)
                          .filter(account -> account.belongsTo(issuer, subject))
                          .orElseThrow(AccountNotFoundException::new);
                  // The only established RevenueCat reference in this schema is the V2 business
                  // UUID.
                  OriginalAccountTargets captured =
                      new OriginalAccountTargets(
                          original.id(),
                          original.issuer(),
                          original.subject(),
                          List.of(original.id().toString()));
                  follows.erase(accountId);
                  notifications.erase(accountId);
                  contributions.erase(accountId);
                  grants.erase(accountId);
                  accounts.erase(accountId);
                  return captured;
                });
    cleanup.clean(targets);
  }
}
