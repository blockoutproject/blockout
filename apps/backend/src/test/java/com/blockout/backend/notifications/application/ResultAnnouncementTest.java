package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.notifications.application.ProcessResultAnnouncement.Transition;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.sporting.application.model.MatchObservation.Result;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;

/** Isolated accepted-transition policy; real producer binding belongs to F07 T013/T014. */
@DisplayName("Result announcement policy")
class ResultAnnouncementTest {
  private static final UUID MATCH = UUID.fromString("00000000-0000-4000-8000-000000000245");
  private static final Instant NOW = Instant.parse("2026-10-24T12:00:00Z");
  private final NotificationStore store = mock(NotificationStore.class);
  private final AnnouncementRecipients recipients = mock(AnnouncementRecipients.class);
  private final ProcessResultAnnouncement processor =
      new ProcessResultAnnouncement(store, recipients, new AllocateAnnouncements(store));

  @ParameterizedTest
  @CsvSource({"false,PLAIN_RESULT,false", "true,ENRICHED_RESULT,true"})
  @DisplayName("Fixes result composition even with zero recipients and an earlier live event")
  void fixesComposition(boolean link, NotificationFamily family, boolean postConsumed) {
    // Given
    when(store.facts(MATCH)).thenReturn(MatchAnnouncementFacts.empty(MATCH).consumeLive());
    when(recipients.select(any())).thenReturn(List.of());

    // When
    assertThat(
            processor.process(
                transition(null, result(ResultStateEnum.FINAL), false, false, true, link)))
        .isEmpty();

    // Then
    verify(store).saveFacts(new MatchAnnouncementFacts(MATCH, true, true, postConsumed, family));
  }

  @ParameterizedTest
  @CsvSource({"true,false,true", "false,true,true", "false,false,false"})
  @DisplayName("Silent final processing preserves the category for a genuinely later publication")
  void suppressesHistoricOrHidden(boolean discovery, boolean reconstruction, boolean visible) {
    // Given
    when(store.facts(MATCH)).thenReturn(MatchAnnouncementFacts.empty(MATCH));

    // When
    assertThat(
            processor.process(
                transition(
                    null, result(ResultStateEnum.FINAL), discovery, reconstruction, visible, true)))
        .isEmpty();

    // Then
    ArgumentCaptor<MatchAnnouncementFacts> recorded =
        ArgumentCaptor.forClass(MatchAnnouncementFacts.class);
    verify(store).saveFacts(recorded.capture());
    assertThat(recorded.getValue().resultProcessed()).isTrue();
    assertThat(recorded.getValue().postResultProcessed()).isFalse();
    assertThat(recorded.getValue().resultComposition()).isNull();
    verifyNoInteractions(recipients);
  }

  @ParameterizedTest
  @EnumSource(value = ResultStateEnum.class, names = "FINAL", mode = EnumSource.Mode.EXCLUDE)
  @DisplayName("Does not infer finality from a score or elapsed time")
  void ignoresNonFinal(ResultStateEnum state) {
    // Given
    when(store.facts(MATCH)).thenReturn(MatchAnnouncementFacts.empty(MATCH));

    // When
    assertThat(processor.process(transition(null, result(state), false, false, true, false)))
        .isEmpty();

    // Then
    verifyNoInteractions(recipients);
    verify(store, never()).saveFacts(any());
  }

  @Test
  @DisplayName("Discovery without a link records no emitted result composition")
  void preservesLaterPublication() {
    // Given
    when(store.facts(MATCH)).thenReturn(MatchAnnouncementFacts.empty(MATCH));

    // When
    processor.process(transition(null, result(ResultStateEnum.FINAL), true, false, true, false));

    // Then
    ArgumentCaptor<MatchAnnouncementFacts> recorded =
        ArgumentCaptor.forClass(MatchAnnouncementFacts.class);
    verify(store).saveFacts(recorded.capture());
    assertThat(recorded.getValue().resultComposition()).isNull();
  }

  @Test
  @DisplayName(
      "An already-final accepted result cannot masquerade as a new event without stored facts")
  void suppressesAlreadyFinal() {
    // Given
    when(store.facts(MATCH)).thenReturn(MatchAnnouncementFacts.empty(MATCH));

    // When
    processor.process(transition(result(ResultStateEnum.FINAL), null, false, false, true, false));

    // Then
    ArgumentCaptor<MatchAnnouncementFacts> recorded =
        ArgumentCaptor.forClass(MatchAnnouncementFacts.class);
    verify(store).saveFacts(recorded.capture());
    assertThat(recorded.getValue().resultProcessed()).isTrue();
    assertThat(recorded.getValue().resultComposition()).isNull();
    verifyNoInteractions(recipients);
  }

  @Test
  @DisplayName("A final result after a provisional score remains eligible without a time cutoff")
  void acceptsFinalAfterProvisional() {
    // Given
    when(store.facts(MATCH)).thenReturn(MatchAnnouncementFacts.empty(MATCH));
    when(recipients.select(any())).thenReturn(List.of());

    // When
    processor.process(
        transition(
            result(ResultStateEnum.PROVISIONAL),
            result(ResultStateEnum.FINAL),
            false,
            false,
            true,
            false));

    // Then
    verify(recipients).select(any());
    verify(store)
        .saveFacts(
            new MatchAnnouncementFacts(MATCH, false, true, false, NotificationFamily.PLAIN_RESULT));
  }

  @ParameterizedTest
  @CsvSource({"true,true", "true,false", "false,true", "false,false"})
  @DisplayName(
      "Never reallocates consumed results after correction, withdrawal, restoration or purge")
  void preservesConsumedFacts(boolean previousFinal, boolean currentFinal) {
    // Given
    when(store.facts(MATCH))
        .thenReturn(
            new MatchAnnouncementFacts(MATCH, false, true, false, NotificationFamily.PLAIN_RESULT));

    // When
    assertThat(
            processor.process(
                transition(
                    previousFinal ? result(ResultStateEnum.FINAL) : null,
                    currentFinal ? result(ResultStateEnum.FINAL) : null,
                    false,
                    false,
                    true,
                    true)))
        .isEmpty();

    // Then
    verifyNoInteractions(recipients);
    verify(store, never()).saveFacts(any());
  }

  /**
   * Supplies accepted F02 values; no schedule/provider kind can impose a time or professional
   * limit.
   *
   * @param previous previous accepted result
   * @param current current accepted result
   * @param discovered trusted first-discovery context
   * @param reconstruction trusted import/reconstruction context
   * @param visible current sporting visibility
   * @param link current accepted F08 availability
   * @return isolated accepted transition
   */
  private Transition transition(
      Result previous,
      Result current,
      boolean discovered,
      boolean reconstruction,
      boolean visible,
      boolean link) {
    return new Transition(
        new MatchView(MATCH, MATCH, "professional-or-amateur", MATCH, MATCH),
        previous,
        current,
        discovered,
        reconstruction,
        visible,
        link,
        NOW);
  }

  /**
   * Creates an attributable accepted score with explicit owner finality.
   *
   * @param state designated owner finality
   * @return accepted numeric result
   */
  private Result result(ResultStateEnum state) {
    return new Result(state, 3, 1, null);
  }
}
