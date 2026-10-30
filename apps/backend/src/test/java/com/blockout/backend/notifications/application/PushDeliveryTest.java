package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.notifications.application.AllocateAnnouncements.Created;
import com.blockout.backend.notifications.application.PushProvider.Message;
import com.blockout.backend.notifications.application.PushProvider.Outcome;
import com.blockout.backend.notifications.application.PushProvider.Status;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Target;
import com.blockout.backend.notifications.domain.NotificationMessage;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/** Controlled transport and scheduler prove bounded ephemeral work, never physical receipt. */
@DisplayName("Best-effort committed push work")
class PushDeliveryTest {
  private static final UUID OWNER = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final Instant NOW = Instant.parse("2026-10-30T12:00:00Z");
  private final ReadPushEligibility eligibility = mock(ReadPushEligibility.class);
  private final PushSubscriptionStore subscriptions = mock(PushSubscriptionStore.class);
  private final SportingPushAdmission admission = mock(SportingPushAdmission.class);
  private final PushProvider provider = mock(PushProvider.class);
  private final TaskScheduler scheduler = mock(TaskScheduler.class);
  private final ThreadPoolTaskExecutor executor = mock(ThreadPoolTaskExecutor.class);
  private final DeliverPush delivery =
      new DeliverPush(
          eligibility,
          subscriptions,
          admission,
          provider,
          executor,
          scheduler,
          Clock.fixed(NOW, ZoneOffset.UTC),
          true);
  private final Target target = new Target(UUID.randomUUID(), 7, "ExponentPushToken[synthetic]");
  private final Created created =
      new Created(
          new AllocateAnnouncements.Entry(
              UUID.randomUUID(),
              OWNER,
              UUID.randomUUID(),
              com.blockout.backend.notifications.domain.NotificationFamily.PLAIN_RESULT,
              com.blockout.backend.notifications.domain.NotificationVariant.FIRST,
              NOW),
          java.util.Set.of());
  private final Message message =
      new Message(
          target,
          OWNER,
          created.entry().id(),
          created.entry().matchId(),
          new NotificationMessage("Sport", "Safe current facts"));

  @Test
  @DisplayName("Schedules exactly one receipt observation fifteen minutes after acceptance")
  void schedulesOneObservation() {
    // Given
    when(eligibility.current(created, target)).thenReturn(java.util.Optional.of(message));
    when(admission.allowsHandoff()).thenReturn(true);
    when(provider.send(List.of(message)))
        .thenReturn(List.of(new Outcome(Status.ACCEPTED, "ticket")));
    when(provider.receipts(List.of("ticket")))
        .thenReturn(Map.of("ticket", new Outcome(Status.DEVICE_NOT_REGISTERED, null)));
    org.mockito.ArgumentCaptor<Runnable> callback =
        org.mockito.ArgumentCaptor.forClass(Runnable.class);

    // When
    delivery.deliver(List.of(new DeliverPush.Attempt(created, target)));

    // Then
    verify(scheduler).schedule(callback.capture(), eq(NOW.plusSeconds(900)));
    callback.getValue().run();
    verify(subscriptions).invalidate(target.id(), 7, target.address());
    verify(provider, times(1)).send(any());
    verify(provider, times(1)).receipts(List.of("ticket"));
  }

  @Test
  @DisplayName("Checks maintenance immediately before the provider handoff")
  void suppressesMaintenance() {
    // Given
    when(eligibility.current(created, target)).thenReturn(java.util.Optional.of(message));
    when(admission.allowsHandoff()).thenReturn(false);

    // When
    delivery.deliver(List.of(new DeliverPush.Attempt(created, target)));

    // Then
    verifyNoInteractions(provider, scheduler);
    org.mockito.InOrder order = inOrder(eligibility, admission);
    order.verify(eligibility).current(created, target);
    order.verify(admission).allowsHandoff();
  }

  @Test
  @DisplayName("Drops overload without caller-thread sending or replay")
  void dropsOverload() {
    // Given
    doThrow(new TaskRejectedException("controlled overload"))
        .when(executor)
        .execute(any(Runnable.class));

    // When
    delivery.onReady(
        new AfterCommitAnnouncements.Ready(List.of(created), Map.of(OWNER, List.of(target))));

    // Then
    verifyNoInteractions(provider, eligibility, scheduler);
  }

  @Test
  @DisplayName("An uncertain send is attempted once without scheduling a resend")
  void dropsUncertainSend() {
    // Given
    when(eligibility.current(created, target)).thenReturn(java.util.Optional.of(message));
    when(admission.allowsHandoff()).thenReturn(true);
    when(provider.send(any())).thenThrow(new IllegalStateException("controlled unknown outcome"));

    // When
    delivery.deliver(List.of(new DeliverPush.Attempt(created, target)));

    // Then
    verify(provider, times(1)).send(any());
    verifyNoInteractions(scheduler, subscriptions);
  }

  @Test
  @DisplayName("Bounds batches and stays below six hundred messages per project second")
  void boundsBatchesAndRate() {
    // Given
    when(eligibility.current(created, target)).thenReturn(java.util.Optional.of(message));
    when(admission.allowsHandoff()).thenReturn(true);
    java.util.List<Long> handoffs = new java.util.ArrayList<>();
    when(provider.send(any()))
        .thenAnswer(
            call -> {
              List<Message> messages = call.getArgument(0);
              assertThat(messages).hasSize(100);
              handoffs.add(System.nanoTime());
              return java.util.Collections.nCopies(100, new Outcome(Status.UNKNOWN, null));
            });
    org.mockito.ArgumentCaptor<Runnable> work = org.mockito.ArgumentCaptor.forClass(Runnable.class);

    // When
    delivery.onReady(
        new AfterCommitAnnouncements.Ready(
            List.of(created), Map.of(OWNER, java.util.Collections.nCopies(700, target))));
    verify(executor, times(7)).execute(work.capture());
    work.getAllValues().forEach(Runnable::run);

    // Then
    assertThat(handoffs).hasSize(7);
    assertThat(handoffs.get(6) - handoffs.getFirst()).isGreaterThanOrEqualTo(1_000_000_000L);
    verifyNoInteractions(scheduler);
  }

  @Test
  @DisplayName("Restart discards queued work and does not reconstruct sends from the inbox")
  void losesWorkOnRestart() {
    // Given
    delivery.onReady(
        new AfterCommitAnnouncements.Ready(List.of(created), Map.of(OWNER, List.of(target))));

    // When: a new process gets no replay input or durable job.
    DeliverPush restarted =
        new DeliverPush(
            eligibility,
            subscriptions,
            admission,
            provider,
            executor,
            scheduler,
            Clock.fixed(NOW, ZoneOffset.UTC),
            true);
    restarted.onReady(new AfterCommitAnnouncements.Ready(List.of(), Map.of()));

    // Then
    verify(executor, times(1)).execute(any(Runnable.class));
    verifyNoInteractions(provider, eligibility, scheduler);
  }

  @Test
  @DisplayName("Receipt work stays bounded when old callbacks have not run")
  void dropsReceiptOverload() {
    // Given
    when(eligibility.current(created, target)).thenReturn(java.util.Optional.of(message));
    when(admission.allowsHandoff()).thenReturn(true);
    when(provider.send(any())).thenReturn(List.of(new Outcome(Status.ACCEPTED, "ticket")));

    // When
    for (int i = 0; i < 101; i++)
      delivery.deliver(List.of(new DeliverPush.Attempt(created, target)));

    // Then
    verify(scheduler, times(100)).schedule(any(Runnable.class), any(Instant.class));
    verify(provider, times(101)).send(any());
    verify(provider, org.mockito.Mockito.never()).receipts(any());
  }

  @Test
  @DisplayName("Immediate invalidation failure does not discard other accepted tickets")
  void isolatesInvalidationFailure() {
    // Given
    when(eligibility.current(created, target)).thenReturn(java.util.Optional.of(message));
    when(admission.allowsHandoff()).thenReturn(true);
    when(provider.send(any()))
        .thenReturn(
            List.of(
                new Outcome(Status.DEVICE_NOT_REGISTERED, null),
                new Outcome(Status.ACCEPTED, "accepted")));
    when(subscriptions.invalidate(any(), org.mockito.ArgumentMatchers.anyLong(), any()))
        .thenThrow(new IllegalStateException("controlled SQL failure"));

    // When
    delivery.deliver(
        List.of(
            new DeliverPush.Attempt(created, target), new DeliverPush.Attempt(created, target)));

    // Then
    verify(scheduler).schedule(any(Runnable.class), eq(NOW.plusSeconds(900)));
  }
}
