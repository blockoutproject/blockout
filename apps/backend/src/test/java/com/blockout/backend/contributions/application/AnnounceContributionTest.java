package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.notifications.application.AfterCommitAnnouncements;
import com.blockout.backend.notifications.application.AllocateAnnouncements.Created;
import com.blockout.backend.notifications.application.AllocateAnnouncements.Entry;
import com.blockout.backend.notifications.application.ProcessLinkAnnouncement;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationVariant;
import com.blockout.backend.sporting.application.model.MatchObservation.Result;
import com.blockout.backend.sporting.application.model.MatchSchedule;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.service.MatchContributionAccess.Facts;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;

/**
 * Focused owner-boundary mapping; SQL, no-op/refusal and commit timing are integration evidence.
 */
@DisplayName("Accepted public contribution transitions")
class AnnounceContributionTest {
  private static final UUID MATCH = UUID.fromString("00000000-0000-4000-8000-000000000252");
  private static final Instant NOW = Instant.parse("2026-10-24T12:00:00Z");

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName(
      "Uses current permitted availability with F02 finality rather than the proposed address")
  void readsCurrentAvailability(boolean available) {
    // Given
    ReadPublicContribution links = mock(ReadPublicContribution.class);
    ProcessLinkAnnouncement announcements = mock(ProcessLinkAnnouncement.class);
    AfterCommitAnnouncements handoff = mock(AfterCommitAnnouncements.class);
    when(links.read(MATCH))
        .thenReturn(
            available
                ? Optional.of(new ReadPublicContribution.Link(MATCH, "https://youtube.com/current"))
                : Optional.empty());
    AnnounceContribution transitions = new AnnounceContribution(links, announcements, handoff);
    Facts facts =
        new Facts(
            new MatchView(MATCH, MATCH, "synthetic", MATCH, MATCH),
            MatchSchedule.builder().id(MATCH).reliableStart(NOW.minusSeconds(60)).build(),
            new Result(ResultStateEnum.FINAL, 3, 1, null),
            true,
            false);

    // When
    transitions.published(facts, List.of(), NOW);

    // Then
    ArgumentCaptor<ProcessLinkAnnouncement.Context> context =
        ArgumentCaptor.forClass(ProcessLinkAnnouncement.Context.class);
    verify(announcements).process(context.capture(), eq(List.of()));
    assertThat(context.getValue().publicLink()).isEqualTo(available);
    assertThat(context.getValue().finalResult()).isTrue();
    assertThat(context.getValue().acceptedPublication()).isTrue();
    assertThat(context.getValue().now()).isEqualTo(NOW);
    assertThat(context.getValue().match().id()).isEqualTo(MATCH);
    assertThat(context.getValue().start()).isEqualTo(NOW.minusSeconds(60));
  }

  @Test
  @DisplayName("Propagates a required internal failure before any after-commit handoff")
  void propagatesRequiredFailure() {
    // Given
    ReadPublicContribution links = mock(ReadPublicContribution.class);
    ProcessLinkAnnouncement announcements = mock(ProcessLinkAnnouncement.class);
    AfterCommitAnnouncements handoff = mock(AfterCommitAnnouncements.class);
    when(links.read(MATCH)).thenReturn(Optional.empty());
    IllegalStateException failure = new IllegalStateException("Controlled internal failure");
    when(announcements.process(any(), any())).thenThrow(failure);
    AnnounceContribution transitions = new AnnounceContribution(links, announcements, handoff);
    Facts facts =
        new Facts(
            new MatchView(MATCH, MATCH, "synthetic", MATCH, MATCH),
            MatchSchedule.builder().id(MATCH).build(),
            null,
            true,
            false);

    // When
    ThrowingCallable publish = () -> transitions.published(facts, List.of(), NOW);

    // Then
    assertThatThrownBy(publish).isSameAs(failure);
    verifyNoInteractions(handoff);
  }

  @Test
  @DisplayName("Hands the created original-account allocations to the after-commit boundary")
  void handsOffCreatedAllocations() {
    // Given
    ReadPublicContribution links = mock(ReadPublicContribution.class);
    ProcessLinkAnnouncement announcements = mock(ProcessLinkAnnouncement.class);
    AfterCommitAnnouncements handoff = mock(AfterCommitAnnouncements.class);
    when(links.read(MATCH))
        .thenReturn(
            Optional.of(new ReadPublicContribution.Link(MATCH, "https://youtube.com/current")));
    Entry entry =
        new Entry(
            UUID.fromString("00000000-0000-4000-8000-000000000253"),
            UUID.fromString("00000000-0000-4000-8000-000000000254"),
            MATCH,
            NotificationFamily.POST_RESULT_LINK,
            NotificationVariant.FIRST,
            NOW);
    List<Created> created = List.of(new Created(entry, Set.of()));
    when(announcements.process(any(), any())).thenReturn(created);
    AnnounceContribution transitions = new AnnounceContribution(links, announcements, handoff);
    Facts facts =
        new Facts(
            new MatchView(MATCH, MATCH, "synthetic", MATCH, MATCH),
            MatchSchedule.builder().id(MATCH).reliableStart(NOW.minusSeconds(60)).build(),
            new Result(ResultStateEnum.FINAL, 3, 1, null),
            true,
            false);

    // When
    transitions.published(facts, List.of(), NOW);

    // Then
    verify(handoff).submit(created);
  }
}
