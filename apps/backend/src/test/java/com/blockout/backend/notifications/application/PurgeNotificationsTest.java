package com.blockout.backend.notifications.application;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Direct orchestration cases; actual commits, SQL and diagnostics are integration tested. */
@DisplayName("Notification purge orchestration")
class PurgeNotificationsTest {
  @Test
  @DisplayName("Uses one cutoff for every batch even when processing crosses an expiry")
  void retainsOneCutoff() {
    // Given
    Instant now = Instant.parse("2026-10-25T12:00:00Z");
    Instant cutoff = now.minus(Duration.ofDays(29));
    Clock clock = mock(Clock.class);
    when(clock.instant()).thenReturn(now, now.plusSeconds(60));
    PurgeNotifications.ExpiredEntries batches = mock(PurgeNotifications.ExpiredEntries.class);
    when(batches.delete(cutoff))
        .thenReturn(
            new NotificationStore.PurgeBatch(100, true),
            new NotificationStore.PurgeBatch(2, false));
    PurgeNotifications purge = new PurgeNotifications(batches, clock);

    // When
    purge.run();

    // Then
    verify(batches, times(2)).delete(cutoff);
    verifyNoMoreInteractions(batches);
  }

  @Test
  @DisplayName("Stops after failure without retrying within the same pass")
  void leavesFailureForNextPass() {
    // Given
    Instant now = Instant.parse("2026-10-25T12:00:00Z");
    Instant cutoff = now.minus(Duration.ofDays(29));
    PurgeNotifications.ExpiredEntries batches = mock(PurgeNotifications.ExpiredEntries.class);
    when(batches.delete(cutoff)).thenThrow(new IllegalStateException("controlled failure"));
    PurgeNotifications purge = new PurgeNotifications(batches, Clock.fixed(now, ZoneOffset.UTC));

    // When
    purge.run();

    // Then
    verify(batches).delete(cutoff);
    verifyNoMoreInteractions(batches);
  }

  @Test
  @DisplayName("Continues a full selected batch even when another transaction removed its rows")
  void continuesConcurrentRemoval() {
    // Given
    Instant now = Instant.parse("2026-10-25T12:00:00Z");
    Instant cutoff = now.minus(Duration.ofDays(29));
    PurgeNotifications.ExpiredEntries batches = mock(PurgeNotifications.ExpiredEntries.class);
    when(batches.delete(cutoff))
        .thenReturn(
            new NotificationStore.PurgeBatch(0, true), new NotificationStore.PurgeBatch(1, false));
    PurgeNotifications purge = new PurgeNotifications(batches, Clock.fixed(now, ZoneOffset.UTC));

    // When
    purge.run();

    // Then
    verify(batches, times(2)).delete(cutoff);
    verifyNoMoreInteractions(batches);
  }
}
