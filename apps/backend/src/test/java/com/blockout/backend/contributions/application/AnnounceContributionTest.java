package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.notifications.application.AfterCommitAnnouncements;
import com.blockout.backend.notifications.application.ProcessLinkAnnouncement;
import com.blockout.backend.sporting.application.model.MatchObservation.Result;
import com.blockout.backend.sporting.application.model.MatchSchedule;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.service.MatchContributionAccess.Facts;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
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
    transitions.published(facts, NOW);

    // Then
    ArgumentCaptor<ProcessLinkAnnouncement.Context> context =
        ArgumentCaptor.forClass(ProcessLinkAnnouncement.Context.class);
    verify(announcements).process(context.capture());
    assertThat(context.getValue().publicLink()).isEqualTo(available);
    assertThat(context.getValue().finalResult()).isTrue();
    assertThat(context.getValue().acceptedPublication()).isTrue();
    assertThat(context.getValue().now()).isEqualTo(NOW);
    assertThat(context.getValue().match().id()).isEqualTo(MATCH);
    assertThat(context.getValue().start()).isEqualTo(NOW.minusSeconds(60));
  }
}
