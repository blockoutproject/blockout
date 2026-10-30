package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.application.AllocateAnnouncements.Created;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Target;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
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
  private final PushSubscriptionStore subscriptions;

  /**
   * Publishes immutable allocations after commit. Rollback discards the callback.
   *
   * @param created newly allocated entries and original follow relation identities
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public void submit(List<Created> created) {
    if (created.isEmpty()) return;
    Map<UUID, List<Target>> targets =
        created.stream()
            .map(allocation -> allocation.entry().accountId())
            .distinct()
            .collect(Collectors.toUnmodifiableMap(account -> account, subscriptions::targets));
    events.publishEvent(new Pending(new Ready(created, targets)));
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
   * @param targets trigger-time associations per original account; later registration gets no
   *     catch-up
   */
  public record Ready(List<Created> entries, Map<UUID, List<Target>> targets) {
    /**
     * Captures immutable transaction outcomes.
     *
     * @param entries committed immutable allocations
     * @param targets private immutable trigger-time targets
     */
    public Ready {
      entries = List.copyOf(entries);
      targets =
          targets.entrySet().stream()
              .collect(
                  Collectors.toUnmodifiableMap(
                      Map.Entry::getKey, entry -> List.copyOf(entry.getValue())));
    }
  }
}
