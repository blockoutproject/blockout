package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.domain.NotificationRetention;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Ordinary daily retention, preserving already committed removals if a later batch fails. */
@Service
@RequiredArgsConstructor
@Slf4j
public class PurgeNotifications {
  private final DeleteExpiredEntries transaction;
  private final Clock clock;

  /**
   * Removes due personal rows with one fixed elapsed-age cutoff, independent of maintenance. Stops
   * on a failed batch, reports only committed progress and leaves remaining rows for the next
   * ordinary daily pass or manual intervention. No personal references enter diagnostics.
   */
  public void run() {
    Instant cutoff = clock.instant().minus(NotificationRetention.RETENTION);
    long deleted = 0;
    log.atInfo()
        .addKeyValue("operation", "notification_retention")
        .addKeyValue("outcome", "started")
        .log("Daily notification retention started");
    try {
      NotificationStore.PurgeBatch batch;
      do {
        batch = transaction.delete(cutoff);
        deleted += batch.deleted();
      } while (batch.more());
    } catch (RuntimeException failure) {
      log.atError()
          .addKeyValue("operation", "notification_retention")
          .addKeyValue("outcome", "incomplete")
          .addKeyValue("partial_count", deleted)
          .addKeyValue("reason", failure.getClass().getSimpleName())
          .log("Daily notification retention failed after committed removals");
      return;
    }
    log.atInfo()
        .addKeyValue("operation", "notification_retention")
        .addKeyValue("outcome", "completed")
        .addKeyValue("affected_count", deleted)
        .addKeyValue("last_success_at", clock.instant())
        .log("Daily notification retention completed");
  }

  /** Separate proxy owns each short retention transaction, without sporting/account locks. */
  @Service
  @RequiredArgsConstructor
  public static class DeleteExpiredEntries {
    private final NotificationStore store;

    /**
     * Commits one batch independently, including when invoked from an unrelated transaction.
     *
     * @param cutoff inclusive UTC original creation boundary
     * @return committed bounded progress
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public NotificationStore.PurgeBatch delete(Instant cutoff) {
      return store.deleteExpired(cutoff);
    }
  }
}
