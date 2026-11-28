package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.domain.NotificationRetention;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/** Ordinary daily physical retention in one atomic transaction, independent of logical expiry. */
@Service
@RequiredArgsConstructor
@Slf4j
public class PurgeNotifications {
  private final NotificationStore store;
  private final PlatformTransactionManager transactions;
  private final Clock clock;

  /**
   * Deletes due personal rows at one fixed elapsed-age cutoff and reports success after commit. A
   * definite refusal rolls back; a lost commit acknowledgement leaves all-or-none completion
   * unconfirmed. The next ordinary pass or manual intervention safely re-evaluates due rows.
   * Ambient transactions are refused so the inner completion always means a real commit. No
   * personal references are logged.
   *
   * @throws org.springframework.transaction.IllegalTransactionStateException for an ambient
   *     transaction
   */
  @Transactional(propagation = Propagation.NEVER)
  public void run() {
    Instant cutoff = clock.instant().minus(NotificationRetention.RETENTION);
    int deleted;
    log.atInfo()
        .addKeyValue("operation", "notification_retention")
        .addKeyValue("outcome", "started")
        .log("Daily notification retention started");
    try {
      deleted =
          new TransactionTemplate(transactions).execute(status -> store.deleteExpired(cutoff));
    } catch (RuntimeException failure) {
      log.atError()
          .addKeyValue("operation", "notification_retention")
          .addKeyValue("outcome", "incomplete")
          .addKeyValue("reason", failure.getClass().getSimpleName())
          .log("Daily notification retention completion was not confirmed");
      return;
    }
    log.atInfo()
        .addKeyValue("operation", "notification_retention")
        .addKeyValue("outcome", "completed")
        .addKeyValue("affected_count", deleted)
        .addKeyValue("last_success_at", clock.instant())
        .log("Daily notification retention completed");
  }
}
