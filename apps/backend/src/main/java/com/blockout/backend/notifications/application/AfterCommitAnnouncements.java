package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.application.ProcessResultAnnouncement.Created;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Transient handoff only after successful SQL commit; no provider call or persistent retry. */
@Service
@Slf4j
@RequiredArgsConstructor
public class AfterCommitAnnouncements {
  private final ApplicationEventPublisher events;

  /**
   * Publishes immutable allocations after commit. Rollback discards the callback.
   *
   * @param created newly allocated entries and original follow relation identities
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public void submit(List<Created> created) {
    if (created.isEmpty()) return;
    Ready ready = new Ready(created);
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          /** Publishes only once the database transaction has committed. */
          @Override
          public void afterCommit() {
            try {
              events.publishEvent(ready);
            } catch (RuntimeException failure) {
              log.atError()
                  .addKeyValue("operation", "announcement_push_handoff")
                  .addKeyValue("outcome", "failed")
                  .addKeyValue("affected_count", ready.entries().size())
                  .setCause(failure)
                  .log("Committed announcements lost transient push work");
            }
          }
        });
  }

  /**
   * After-commit integration event for the later best-effort sender; no durable delivery promise.
   *
   * @param entries newly committed allocations and original relation identities
   */
  public record Ready(List<Created> entries) {
    /**
     * Captures immutable transaction outcomes.
     *
     * @param entries committed immutable allocations
     */
    public Ready {
      entries = List.copyOf(entries);
    }
  }
}
