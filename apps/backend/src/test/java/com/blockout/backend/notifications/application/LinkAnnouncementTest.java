package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.contributions.application.ReadPublicContribution;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.notifications.application.AllocateAnnouncements.Entry;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.sporting.application.model.MatchObservation.Result;
import com.blockout.backend.sporting.application.model.MatchSchedule;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.service.MatchContributionAccess.Facts;
import com.blockout.backend.sporting.application.service.MatchContributionAccess.LinkAnnouncementFacts;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

/** Isolated allowance decisions. Producer locks and personal writes have integration evidence. */
@DisplayName("Link announcement eligibility")
class LinkAnnouncementTest {
  private static final UUID MATCH_ID = UUID.fromString("00000000-0000-4000-8000-000000000252");
  private static final MatchView MATCH =
      new MatchView(MATCH_ID, MATCH_ID, "synthetic", MATCH_ID, MATCH_ID);
  private static final Instant START = Instant.parse("2026-10-24T12:00:00Z");
  private static final Result FINAL_RESULT = new Result(ResultStateEnum.FINAL, 3, 1, null);
  private final NotificationStore store = mock(NotificationStore.class);
  private final AnnouncementRecipients recipients = mock(AnnouncementRecipients.class);
  private final ReadPublicContribution links = mock(ReadPublicContribution.class);
  private final ProcessLinkAnnouncement processor =
      new ProcessLinkAnnouncement(store, new AllocateAnnouncements(store), recipients, links);

  @ParameterizedTest(name = "At {0} seconds after confirmed start")
  @ValueSource(longs = {0, 1})
  @DisplayName("Consumes the live allowance at or after the reliable start with no audience")
  void consumesDueLiveAllowance(long elapsedSeconds) {
    // Given
    LinkAnnouncementFacts sporting = new LinkAnnouncementFacts(MATCH, START, false, true);
    when(store.facts(MATCH_ID)).thenReturn(MatchAnnouncementFacts.empty(MATCH_ID));
    when(links.availableForConsultableMatch(MATCH_ID)).thenReturn(true);
    when(recipients.select(sporting.match())).thenReturn(Set.of());

    // When
    List<Entry> created = processor.processDueMatch(sporting, START.plusSeconds(elapsedSeconds));

    // Then
    assertThat(created).isEmpty();
    verify(store).saveFacts(new MatchAnnouncementFacts(MATCH_ID, true, false, false, null));
    verify(store, never()).create(any());
  }

  @ParameterizedTest(name = "Visible: {0}, start offset: {1} seconds")
  @CsvSource({"false,0", "true,1", "true,"})
  @DisplayName(
      "Skips the presence read when a live candidate is hidden, early or has no reliable start")
  void skipsIneligibleLiveCandidate(boolean viewable, Long startOffset) {
    // Given
    Instant start = startOffset == null ? null : START.plusSeconds(startOffset);
    LinkAnnouncementFacts sporting = new LinkAnnouncementFacts(MATCH, start, false, viewable);

    // When
    List<Entry> created = processor.processDueMatch(sporting, START);

    // Then
    assertThat(created).isEmpty();
    verifyNoInteractions(store, links, recipients);
  }

  @Test
  @DisplayName("Only publication can consume an unused post-result allowance")
  void skipsFinalDueMatch() {
    // Given
    LinkAnnouncementFacts sporting = new LinkAnnouncementFacts(MATCH, START, true, true);

    // When
    List<Entry> created = processor.processDueMatch(sporting, START);

    // Then
    assertThat(created).isEmpty();
    verifyNoInteractions(store, links, recipients);
  }

  @ParameterizedTest(name = "{1}")
  @CsvSource({"false,LIVE_LINK", "true,POST_RESULT_LINK"})
  @DisplayName("Allocates an accepted publication without rereading the link")
  void consumesAcceptedPublication(boolean finalized, NotificationFamily family) {
    // Given
    Facts sporting = finalized ? sporting(null, FINAL_RESULT, true) : sporting(START, null, true);
    UUID follower = UUID.fromString("00000000-0000-4000-8000-000000000253");
    NotificationFamily resultComposition = finalized ? NotificationFamily.PLAIN_RESULT : null;
    when(store.facts(MATCH_ID))
        .thenReturn(
            new MatchAnnouncementFacts(MATCH_ID, false, finalized, false, resultComposition));
    when(recipients.select(sporting.match())).thenReturn(Set.of(follower));

    // When
    List<Entry> created = processor.processAcceptedPublication(sporting, START);

    // Then
    assertThat(created)
        .singleElement()
        .satisfies(
            entry -> {
              assertThat(entry.accountId()).isEqualTo(follower);
              assertThat(entry.family()).isEqualTo(family);
              assertThat(entry.createdAt()).isEqualTo(START);
            });
    verify(store)
        .saveFacts(
            new MatchAnnouncementFacts(
                MATCH_ID, !finalized, finalized, finalized, resultComposition));
    verify(store).create(created.getFirst());
    verifyNoInteractions(links);
  }

  @ParameterizedTest(name = "Final result: {0}")
  @ValueSource(booleans = {false, true})
  @DisplayName("Preserves a consumed live or post-result allowance without rereading F08")
  void preservesConsumedAllowance(boolean finalized) {
    // Given
    Facts sporting = sporting(START, finalized ? FINAL_RESULT : null, true);
    when(store.facts(MATCH_ID))
        .thenReturn(new MatchAnnouncementFacts(MATCH_ID, !finalized, finalized, finalized, null));

    // When
    List<Entry> created = processor.processAcceptedPublication(sporting, START);

    // Then
    assertThat(created).isEmpty();
    verify(store, never()).saveFacts(any());
    verifyNoInteractions(links, recipients);
  }

  @Test
  @DisplayName("Preserves the live allowance if a due candidate has no current public link")
  void preservesAllowanceWithoutCurrentLink() {
    // Given
    LinkAnnouncementFacts sporting = new LinkAnnouncementFacts(MATCH, START, false, true);
    when(store.facts(MATCH_ID)).thenReturn(MatchAnnouncementFacts.empty(MATCH_ID));
    when(links.availableForConsultableMatch(MATCH_ID)).thenReturn(false);

    // When
    List<Entry> created = processor.processDueMatch(sporting, START);

    // Then
    assertThat(created).isEmpty();
    verify(store, never()).saveFacts(any());
    verifyNoInteractions(recipients);
  }

  @Test
  @DisplayName(
      "Propagates a due candidate's contribution read failure before consuming the allowance")
  void propagatesRequiredPresenceFailure() {
    // Given
    LinkAnnouncementFacts sporting = new LinkAnnouncementFacts(MATCH, START, false, true);
    IllegalStateException unavailable = new IllegalStateException("Fixture contribution outage");
    when(store.facts(MATCH_ID)).thenReturn(MatchAnnouncementFacts.empty(MATCH_ID));
    when(links.availableForConsultableMatch(MATCH_ID)).thenThrow(unavailable);

    // When / Then
    assertThatThrownBy(() -> processor.processDueMatch(sporting, START)).isSameAs(unavailable);
    verify(store, never()).saveFacts(any());
    verifyNoInteractions(recipients);
  }

  private Facts sporting(Instant start, Result result, boolean viewable) {
    return new Facts(
        MATCH,
        MatchSchedule.builder().id(MATCH_ID).reliableStart(start).build(),
        result,
        viewable,
        false);
  }
}
