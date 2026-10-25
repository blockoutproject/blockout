package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.backend.notifications.application.AllocateAnnouncements.Created;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Isolated link allowance decisions; producer locks and personal writes have integration evidence.
 */
@DisplayName("Link announcement timing")
class LinkAnnouncementTest {
  private static final UUID MATCH = UUID.fromString("00000000-0000-4000-8000-000000000252");
  private static final Instant START = Instant.parse("2026-10-24T12:00:00Z");
  private final NotificationStore store = mock(NotificationStore.class);
  private final ProcessLinkAnnouncement processor =
      new ProcessLinkAnnouncement(store, new AllocateAnnouncements(store));

  @ParameterizedTest
  @CsvSource({"0,false", "1,false", "0,true"})
  @DisplayName(
      "Consumes the live allowance at or after the reliable start even without an audience")
  void consumesDueLiveAllowance(long elapsedSeconds, boolean acceptedPublication) {
    // Given
    when(store.facts(MATCH))
        .thenReturn(new MatchAnnouncementFacts(MATCH, false, false, false, null));
    ProcessLinkAnnouncement.Context context =
        new ProcessLinkAnnouncement.Context(
            new MatchView(MATCH, MATCH, "synthetic", MATCH, MATCH),
            true,
            false,
            START,
            acceptedPublication,
            START.plusSeconds(elapsedSeconds));

    // When
    List<Created> created = processor.process(context, List.of());

    // Then
    assertThat(created).isEmpty();
    verify(store).saveFacts(new MatchAnnouncementFacts(MATCH, true, false, false, null));
    verify(store, never()).create(any());
  }

  @Test
  @DisplayName("Preserves the live allowance immediately before the reliable start")
  void preservesFutureAllowance() {
    // Given
    when(store.facts(MATCH))
        .thenReturn(new MatchAnnouncementFacts(MATCH, false, false, false, null));
    ProcessLinkAnnouncement.Context context =
        new ProcessLinkAnnouncement.Context(
            new MatchView(MATCH, MATCH, "synthetic", MATCH, MATCH),
            true,
            false,
            START,
            false,
            START.minusSeconds(1));

    // When
    List<Created> created = processor.process(context, List.of());

    // Then
    assertThat(created).isEmpty();
    verify(store, never()).saveFacts(any());
    verify(store, never()).create(any());
  }

  @Test
  @DisplayName("Consumes the unused post-result allowance for a later accepted publication")
  void consumesLaterPublication() {
    // Given
    when(store.facts(MATCH))
        .thenReturn(new MatchAnnouncementFacts(MATCH, false, true, false, null));
    ProcessLinkAnnouncement.Context context =
        new ProcessLinkAnnouncement.Context(
            new MatchView(MATCH, MATCH, "synthetic", MATCH, MATCH), true, true, null, true, START);

    // When
    List<Created> created = processor.process(context, List.of());

    // Then
    assertThat(created).isEmpty();
    verify(store).saveFacts(new MatchAnnouncementFacts(MATCH, false, true, true, null));
  }

  @ParameterizedTest
  @CsvSource({"false,false", "true,true"})
  @DisplayName("Preserves a final match without a new publication or with a consumed allowance")
  void preservesUnavailablePublication(boolean publication, boolean consumed) {
    // Given
    when(store.facts(MATCH))
        .thenReturn(new MatchAnnouncementFacts(MATCH, false, true, consumed, null));
    ProcessLinkAnnouncement.Context context =
        new ProcessLinkAnnouncement.Context(
            new MatchView(MATCH, MATCH, "synthetic", MATCH, MATCH),
            true,
            true,
            null,
            publication,
            START);

    // When
    List<Created> created = processor.process(context, List.of());

    // Then
    assertThat(created).isEmpty();
    verify(store, never()).saveFacts(any());
    verify(store, never()).create(any());
  }

  @ParameterizedTest
  @CsvSource({"false,true,false", "true,false,false", "true,true,true"})
  @DisplayName(
      "Preserves live facts when availability, reliable time or an unused allowance is absent")
  void preservesUnavailableLiveAllowance(boolean available, boolean knownTime, boolean consumed) {
    // Given
    when(store.facts(MATCH))
        .thenReturn(new MatchAnnouncementFacts(MATCH, consumed, false, false, null));
    ProcessLinkAnnouncement.Context context =
        new ProcessLinkAnnouncement.Context(
            new MatchView(MATCH, MATCH, "synthetic", MATCH, MATCH),
            available,
            false,
            knownTime ? START : null,
            true,
            START);

    // When
    List<Created> created = processor.process(context, List.of());

    // Then
    assertThat(created).isEmpty();
    verify(store, never()).saveFacts(any());
    verify(store, never()).create(any());
  }
}
