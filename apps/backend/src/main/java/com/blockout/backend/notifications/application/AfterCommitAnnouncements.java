package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.application.AllocateAnnouncements.Entry;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Target;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Transient handoff only after successful SQL commit; no provider call or persistent retry. */
@RequiredArgsConstructor
public class AfterCommitAnnouncements {
  private final ApplicationEventPublisher events;
  private final PushSubscriptionStore subscriptions;
  private final boolean pushEnabled;

  /**
   * Publishes the allocations for after-commit consumers. Only an enabled deployment captures
   * destinations, inside the producer transaction and only for the already selected accounts.
   *
   * @param created newly allocated entries
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public void submit(List<Entry> created) {
    if (created.isEmpty()) {
      return;
    }
    Map<UUID, List<Target>> targets =
        pushEnabled
            ? subscriptions.targets(created.stream().map(Entry::accountId).toList())
            : Map.of();
    events.publishEvent(new Ready(created, targets));
  }

  /**
   * After-commit integration event for the later best-effort sender; no durable delivery promise.
   *
   * @param entries newly committed allocations
   * @param targets trigger-time associations per original account; later registration gets no
   *     catch-up
   */
  public record Ready(List<Entry> entries, Map<UUID, List<Target>> targets) {
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
