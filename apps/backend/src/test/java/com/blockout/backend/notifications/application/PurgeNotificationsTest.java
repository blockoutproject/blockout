package com.blockout.backend.notifications.application;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

/** Direct orchestration cases; actual SQL atomicity and commit failure are PostgreSQL tested. */
@DisplayName("Notification purge orchestration")
class PurgeNotificationsTest {
  @Test
  @DisplayName("Deletes once at the original cutoff even when completion crosses an expiry")
  void retainsOneCutoff() {
    // Given
    Instant now = Instant.parse("2026-10-25T12:00:00Z");
    Instant cutoff = Instant.parse("2026-09-26T12:00:00Z");
    Clock clock = mock(Clock.class);
    when(clock.instant()).thenReturn(now, now.plusSeconds(60));
    NotificationStore store = mock(NotificationStore.class);
    when(store.deleteExpired(cutoff)).thenReturn(102);
    PlatformTransactionManager transactions = mock(PlatformTransactionManager.class);
    SimpleTransactionStatus transaction = new SimpleTransactionStatus();
    when(transactions.getTransaction(any())).thenReturn(transaction);
    PurgeNotifications purge = new PurgeNotifications(store, transactions, clock);

    // When
    purge.run();

    // Then
    verify(store).deleteExpired(cutoff);
    verifyNoMoreInteractions(store);
    verify(transactions).commit(transaction);
  }
}
