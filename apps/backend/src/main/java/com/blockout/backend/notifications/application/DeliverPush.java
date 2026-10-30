package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.application.AllocateAnnouncements.Created;
import com.blockout.backend.notifications.application.PushProvider.Message;
import com.blockout.backend.notifications.application.PushProvider.Outcome;
import com.blockout.backend.notifications.application.PushProvider.Status;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Target;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Semaphore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/** Single-project bounded after-commit attempts; SQL remains the sole durable inbox. */
@Slf4j
@RequiredArgsConstructor
public class DeliverPush {
  private final ReadPushEligibility eligibility;
  private final PushSubscriptionStore subscriptions;
  private final SportingPushAdmission admission;
  private final PushProvider provider;
  private final ThreadPoolTaskExecutor executor;
  private final TaskScheduler scheduler;
  private final Clock clock;
  private final boolean enabled;
  private final Semaphore receiptSlots = new Semaphore(100);

  /**
   * Submits batches of at most 100 captured targets to the ordinary bounded executor. Rejected work
   * is dropped without caller-thread transport, replay or SQL mutation.
   *
   * @param ready successful commit's original allocations and associations
   */
  @EventListener
  public void onReady(AfterCommitAnnouncements.Ready ready) {
    if (!enabled) return;
    List<Attempt> batch = new ArrayList<>(100);
    for (Created created : ready.entries()) {
      for (Target target : ready.targets().getOrDefault(created.entry().accountId(), List.of())) {
        batch.add(new Attempt(created, target));
        if (batch.size() == 100) {
          submit(List.copyOf(batch));
          batch.clear();
        }
      }
    }
    if (!batch.isEmpty()) submit(List.copyOf(batch));
  }

  /**
   * Runs one paced batch on the single worker. Reads finish before F12's final current check and
   * HTTP; maintenance/read/transport failures lose only ephemeral work.
   *
   * @param attempts at most 100 immutable original targets
   */
  public void deliver(List<Attempt> attempts) {
    try {
      // One worker and at least 200 ms between batches cap this project's rate below 600/s.
      Thread.sleep(Duration.ofMillis(200));
      List<Message> messages = new ArrayList<>();
      for (Attempt attempt : attempts)
        eligibility.current(attempt.created(), attempt.target()).ifPresent(messages::add);
      if (messages.isEmpty() || !admission.allowsHandoff()) return;
      List<Outcome> outcomes = provider.send(messages);
      Map<String, Target> tickets = new LinkedHashMap<>();
      for (int i = 0; i < messages.size(); i++) {
        Outcome outcome = outcomes.get(i);
        Target target = messages.get(i).target();
        if (outcome.status() == Status.DEVICE_NOT_REGISTERED) invalidate(target);
        if (outcome.status() == Status.ACCEPTED && outcome.ticketId() != null)
          tickets.put(outcome.ticketId(), target);
      }
      if (!tickets.isEmpty()) scheduleReceipts(Map.copyOf(tickets));
    } catch (InterruptedException interrupted) {
      Thread.currentThread().interrupt();
      lost("interrupted", attempts.size());
    } catch (RuntimeException failure) {
      lost("handoff_unavailable_or_uncertain", attempts.size());
    }
  }

  /**
   * Submits one immutable batch; native rejection never runs transport on the producer thread.
   *
   * @param attempts captured batch bounded to 100
   */
  private void submit(List<Attempt> attempts) {
    try {
      executor.execute(() -> deliver(attempts));
    } catch (TaskRejectedException rejected) {
      lost("send_overload_or_shutdown", attempts.size());
    }
  }

  /**
   * Retains at most 100 receipt callbacks of at most 100 tickets each, solely in process memory.
   *
   * @param tickets accepted IDs with their exact original row/version/address
   */
  private void scheduleReceipts(Map<String, Target> tickets) {
    if (!receiptSlots.tryAcquire()) {
      lost("receipt_overload", tickets.size());
      return;
    }
    try {
      scheduler.schedule(
          () -> {
            try {
              Map<String, Outcome> outcomes = provider.receipts(List.copyOf(tickets.keySet()));
              for (Map.Entry<String, Target> ticket : tickets.entrySet()) {
                Outcome outcome = outcomes.get(ticket.getKey());
                if (outcome != null && outcome.status() == Status.DEVICE_NOT_REGISTERED)
                  invalidate(ticket.getValue());
              }
            } catch (RuntimeException failure) {
              lost("receipt_unavailable", tickets.size());
            } finally {
              receiptSlots.release();
            }
          },
          clock.instant().plus(Duration.ofMinutes(15)));
    } catch (RuntimeException rejected) {
      receiptSlots.release();
      lost("receipt_shutdown", tickets.size());
    }
  }

  /**
   * Applies conditional invalidation in its own short SQL transaction through the real store.
   *
   * @param target exact original row/version/address, never a replacement registration
   */
  private void invalidate(Target target) {
    try {
      subscriptions.invalidate(target.id(), target.revision(), target.address());
    } catch (RuntimeException failure) {
      lost("invalidation_unavailable", 1);
    }
  }

  /**
   * Reports only bounded technical categories/counts, never IDs, addresses, content or exceptions.
   *
   * @param reason fixed local failure category
   * @param count ephemeral targets or tickets affected
   */
  private void lost(String reason, int count) {
    log.atWarn()
        .addKeyValue("operation", "sporting_push")
        .addKeyValue("provider", "expo")
        .addKeyValue("outcome", "dropped")
        .addKeyValue("reason", reason)
        .addKeyValue("affected_count", count)
        .log("Ephemeral push work dropped");
  }

  /** One original allocation and selected association; never a durable job. */
  public record Attempt(Created created, Target target) {}
}
