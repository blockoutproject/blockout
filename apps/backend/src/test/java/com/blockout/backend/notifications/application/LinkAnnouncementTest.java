package com.blockout.backend.notifications.application;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Isolated current-link timing decisions; actual producer/lock proof lives in integration tests.
 */
@DisplayName("Link announcement timing")
class LinkAnnouncementTest {
  private static final UUID MATCH = UUID.fromString("00000000-0000-4000-8000-000000000252");
  private static final Instant H = Instant.parse("2026-10-24T12:00:00Z");

  @ParameterizedTest
  @CsvSource({"-1,false,false", "0,false,true", "1,false,true", "0,true,true"})
  @DisplayName("Consumes live at the reliable start instant even with no audience")
  void consumesAtStart(long seconds, boolean publication, boolean consumed) {
    // Given
    NotificationStore store = mock(NotificationStore.class);
    when(store.facts(MATCH)).thenReturn(MatchAnnouncementFacts.empty(MATCH));
    ProcessLinkAnnouncement processor = new ProcessLinkAnnouncement(store);

    // When
    processor.process(
        new ProcessLinkAnnouncement.Context(
            new MatchView(MATCH, MATCH, "synthetic", MATCH, MATCH),
            true,
            false,
            H,
            publication,
            H.plusSeconds(seconds)),
        List.of());

    // Then
    if (consumed) verify(store).saveFacts(MatchAnnouncementFacts.empty(MATCH).consumeLive());
    else
      org.mockito.Mockito.verify(store, org.mockito.Mockito.never())
          .saveFacts(org.mockito.ArgumentMatchers.any());
  }

  @ParameterizedTest
  @CsvSource({"true,false,true", "false,false,false", "true,true,false"})
  @DisplayName("Only an accepted later publication can consume an unused post-result allowance")
  void requiresNewPublication(boolean publication, boolean consumed, boolean expected) {
    // Given
    NotificationStore store = mock(NotificationStore.class);
    MatchAnnouncementFacts facts = MatchAnnouncementFacts.empty(MATCH).consumeResult(null);
    if (consumed) facts = facts.consumePostResultLink();
    when(store.facts(MATCH)).thenReturn(facts);
    ProcessLinkAnnouncement processor = new ProcessLinkAnnouncement(store);

    // When
    processor.process(
        new ProcessLinkAnnouncement.Context(
            new MatchView(MATCH, MATCH, "synthetic", MATCH, MATCH),
            true,
            true,
            null,
            publication,
            H),
        List.of());

    // Then
    if (expected) verify(store).saveFacts(facts.consumePostResultLink());
    else
      org.mockito.Mockito.verify(store, org.mockito.Mockito.never())
          .saveFacts(org.mockito.ArgumentMatchers.any());
  }

  @ParameterizedTest
  @CsvSource({"false,true,false", "true,false,false", "true,true,true"})
  @DisplayName(
      "Absent availability unknown time and an already processed category create no new live fact")
  void preservesUnavailableOrConsumed(boolean available, boolean knownTime, boolean consumed) {
    // Given
    NotificationStore store = mock(NotificationStore.class);
    MatchAnnouncementFacts facts = MatchAnnouncementFacts.empty(MATCH);
    if (consumed) facts = facts.consumeLive();
    when(store.facts(MATCH)).thenReturn(facts);
    ProcessLinkAnnouncement processor = new ProcessLinkAnnouncement(store);

    // When
    processor.process(
        new ProcessLinkAnnouncement.Context(
            new MatchView(MATCH, MATCH, "synthetic", MATCH, MATCH),
            available,
            false,
            knownTime ? H : null,
            true,
            H),
        List.of());

    // Then
    org.mockito.Mockito.verify(store, org.mockito.Mockito.never())
        .saveFacts(org.mockito.ArgumentMatchers.any());
  }

  @ParameterizedTest
  @CsvSource({
    "2026-03-14,20:00,2026-03-14T15:00:00-04:00",
    "2026-03-29,20:00,2026-03-29T14:00:00-04:00",
    "2026-10-31,20:00,2026-10-31T15:00:00-04:00"
  })
  @DisplayName(
      "Paris starts and New York processing use the same instant across differing DST weeks")
  void comparesReliableInstants(String date, String parisTime, String newYorkTime) {
    // Given
    Instant start =
        com.blockout.backend.sporting.domain.MatchFacts.resolveStart(
            java.time.LocalDate.parse(date), parisTime, "Europe/Paris");
    Instant now = OffsetDateTime.parse(newYorkTime).toInstant();
    NotificationStore store = mock(NotificationStore.class);
    when(store.facts(MATCH)).thenReturn(MatchAnnouncementFacts.empty(MATCH));
    ProcessLinkAnnouncement processor = new ProcessLinkAnnouncement(store);

    // When
    processor.process(
        new ProcessLinkAnnouncement.Context(
            new MatchView(MATCH, MATCH, "synthetic", MATCH, MATCH), true, false, start, false, now),
        List.of());

    // Then
    verify(store).saveFacts(MatchAnnouncementFacts.empty(MATCH).consumeLive());
  }
}
