package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.blockout.backend.notifications.application.AllocateAnnouncements.Entry;
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
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.slf4j.LoggerFactory;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/** Controlled transport and scheduler prove bounded ephemeral work, never physical receipt. */
@DisplayName("Best-effort committed push work")
class PushDeliveryTest {
  private static final UUID OWNER = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID SUBSCRIPTION_ID =
      UUID.fromString("00000000-0000-4000-8000-000000002821");
  private static final UUID NOTIFICATION_ID =
      UUID.fromString("00000000-0000-4000-8000-000000002822");
  private static final UUID MATCH_ID = UUID.fromString("00000000-0000-4000-8000-000000002823");
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
          Clock.fixed(NOW, ZoneOffset.UTC));
  private final Target target = new Target(SUBSCRIPTION_ID, 7, "ExponentPushToken[synthetic]");
  private final Entry created =
      new Entry(
          NOTIFICATION_ID,
          OWNER,
          MATCH_ID,
          com.blockout.backend.notifications.domain.NotificationFamily.PLAIN_RESULT,
          com.blockout.backend.notifications.domain.NotificationVariant.FIRST,
          NOW);
  private final Message message =
      new Message(
          target,
          OWNER,
          created.id(),
          created.matchId(),
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
  @DisplayName("Receipt work stays bounded when old callbacks have not run")
  void dropsReceiptOverload() {
    // Given
    when(eligibility.current(created, target)).thenReturn(java.util.Optional.of(message));
    when(admission.allowsHandoff()).thenReturn(true);
    when(provider.send(any())).thenReturn(List.of(new Outcome(Status.ACCEPTED, "ticket")));

    // When
    for (int i = 0; i < 101; i++) {
      delivery.deliver(List.of(new DeliverPush.Attempt(created, target)));
    }

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

  @Nested
  @DisplayName("Worker failure diagnostics")
  class FailureDiagnostics {
    private final Logger logger = (Logger) LoggerFactory.getLogger(DeliverPush.class);
    private final ListAppender<ILoggingEvent> events = new ListAppender<>();
    private final Target secondTarget =
        new Target(
            UUID.fromString("00000000-0000-4000-8000-000000002824"), 5, "Expo[synthetic-second]");

    @BeforeEach
    void captureDiagnostics() {
      events.start();
      logger.addAppender(events);
    }

    @AfterEach
    void releaseDiagnostics() {
      logger.detachAppender(events);
      events.stop();
    }

    @Test
    @DisplayName("Preparation failure accounts for the batch before calling the provider")
    void reportsFailedPreparation() {
      // Given
      when(eligibility.current(created, target)).thenReturn(Optional.of(message));
      when(eligibility.current(created, secondTarget))
          .thenThrow(new IllegalStateException("synthetic private database detail"));

      // When
      delivery.deliver(
          List.of(
              new DeliverPush.Attempt(created, target),
              new DeliverPush.Attempt(created, secondTarget)));

      // Then
      verifyNoInteractions(admission, provider, scheduler, subscriptions);
      assertDiagnostic("preparation", "failed", "handoff_unavailable", 2);
    }

    @Test
    @DisplayName("Uncertain transport accounts only for submitted messages without replay")
    void reportsUncertainTransport() {
      // Given
      when(eligibility.current(created, target)).thenReturn(Optional.of(message));
      when(eligibility.current(created, secondTarget)).thenReturn(Optional.empty());
      when(admission.allowsHandoff()).thenReturn(true);
      when(provider.send(List.of(message)))
          .thenThrow(new IllegalStateException("synthetic private provider detail"));

      // When
      delivery.deliver(
          List.of(
              new DeliverPush.Attempt(created, target),
              new DeliverPush.Attempt(created, secondTarget)));

      // Then
      verify(provider).send(List.of(message));
      verifyNoMoreInteractions(provider);
      verifyNoInteractions(scheduler, subscriptions);
      assertDiagnostic("transport", "unknown", "handoff_uncertain", 1);
    }

    @Test
    @DisplayName("A failed receipt lookup leaves its evidence unknown without a second attempt")
    void reportsUncertainReceiptLookup() {
      // Given
      String ticket = "synthetic-ticket";
      when(eligibility.current(created, target)).thenReturn(Optional.of(message));
      when(admission.allowsHandoff()).thenReturn(true);
      when(provider.send(List.of(message)))
          .thenReturn(List.of(new Outcome(Status.ACCEPTED, ticket)));
      when(provider.receipts(List.of(ticket)))
          .thenThrow(new IllegalStateException("synthetic private receipt detail"));
      delivery.deliver(List.of(new DeliverPush.Attempt(created, target)));
      ArgumentCaptor<Runnable> callback = ArgumentCaptor.forClass(Runnable.class);
      verify(scheduler).schedule(callback.capture(), eq(NOW.plusSeconds(900)));

      // When
      callback.getValue().run();

      // Then
      verify(provider).send(List.of(message));
      verify(provider).receipts(List.of(ticket));
      verifyNoMoreInteractions(provider, scheduler);
      verifyNoInteractions(subscriptions);
      assertDiagnostic("receipt", "unknown", "receipt_unavailable", 1);
    }

    private void assertDiagnostic(String stage, String outcome, String reason, int affectedCount) {
      assertThat(events.list)
          .singleElement()
          .satisfies(
              event -> {
                assertThat(event.getThrowableProxy()).isNull();
                assertThat(event.getFormattedMessage())
                    .doesNotContain(
                        "synthetic private",
                        target.address(),
                        message.text().body(),
                        OWNER.toString());
                assertThat(event.getKeyValuePairs())
                    .extracting(value -> value.key, value -> value.value)
                    .containsExactlyInAnyOrder(
                        tuple("operation", "sporting_push"),
                        tuple("provider", "expo"),
                        tuple("stage", stage),
                        tuple("outcome", outcome),
                        tuple("reason", reason),
                        tuple("affected_count", affectedCount));
              });
    }
  }
}
