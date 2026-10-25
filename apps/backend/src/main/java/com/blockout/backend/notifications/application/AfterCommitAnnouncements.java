package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.application.AllocateAnnouncements.Created;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

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
    events.publishEvent(new Pending(new Ready(created)));
  }

  /** Internal allocation event; consumers receive Ready only after successful commit. */
  private record Pending(Ready ready) {}

  /**
   * Emits committed allocations before projection invalidation, even when invalidation was
   * registered first. A transient sender failure never turns the committed producer result into a
   * failure.
   *
   * @param pending immutable allocations registered by the mandatory producer transaction
   */
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  @Order(Ordered.HIGHEST_PRECEDENCE)
  public void afterCommit(Pending pending) {
    try {
      events.publishEvent(pending.ready());
    } catch (RuntimeException failure) {
      log.atError()
          .addKeyValue("operation", "announcement_push_handoff")
          .addKeyValue("outcome", "failed")
          .addKeyValue("affected_count", pending.ready().entries().size())
          .addKeyValue("reason", failure.getClass().getSimpleName())
          .log("Committed announcements lost transient push work");
    }
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
