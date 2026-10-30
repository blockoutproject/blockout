package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.application.AllocateAnnouncements.Created;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Target;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Transient handoff only after successful SQL commit; no provider call or persistent retry. */
@Service
@RequiredArgsConstructor
public class AfterCommitAnnouncements {
  private final ApplicationEventPublisher events;
  private final PushSubscriptionStore subscriptions;

  /**
   * Captures immutable allocations inside the producer transaction for the native after-commit
   * consumer.
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
    events.publishEvent(new Ready(created, targets));
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
