package com.blockout.backend.collection.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import java.net.URI;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Discovery decisions with controlled owner ports; database atomicity is qualified separately. */
@DisplayName("Source discovery decisions")
class ObserveCollectionSourceTest {
  private static final UUID STARTUP = UUID.fromString("00000000-0000-4000-8000-000000000171");
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000172");
  private static final UUID SOURCE = UUID.fromString("00000000-0000-4000-8000-000000000173");
  private final CollectionStore store = mock(CollectionStore.class);
  private final CollectorRuntimeAccess runtimes = mock(CollectorRuntimeAccess.class);
  private final ChangeCollectionSeasons seasons = mock(ChangeCollectionSeasons.class);
  private final org.springframework.context.ApplicationEventPublisher events =
      mock(org.springframework.context.ApplicationEventPublisher.class);
  private final ObserveCollectionSource service =
      new ObserveCollectionSource(store, runtimes, seasons, events);

  @Test
  @DisplayName("A repeated discovery preserves the operator candidate and active season")
  void preservesOperatorCandidate() {
    // Given
    ObserveCollectionSource.Proposal proposal = proposal();
    when(seasons.getOrCreate(2026)).thenReturn(new SeasonView(SEASON, 2026, "2026/2027"));
    when(seasons.lockCollectionState(SEASON))
        .thenReturn(
            new CollectionSeasonView(
                SEASON, "2026/2027", 2026, CollectionSeasonStateEnum.ACTIVE, 4));
    Source existing =
        Source.builder()
            .id(SOURCE)
            .seasonId(SEASON)
            .provider(CollectionProviderEnum.FFVB)
            .organizerReference("LIRA")
            .candidateUrl("https://www.ffvbbeach.org/operator-choice")
            .build();
    when(store.source(SEASON, CollectionProviderEnum.FFVB, "LIRA"))
        .thenReturn(Optional.of(existing));

    // When
    ObserveCollectionSource.Resolved result = service.observe(proposal);

    // Then
    assertThat(result).isEqualTo(new ObserveCollectionSource.Resolved(SEASON, SOURCE));
    verify(store, never()).createSource(any(), any(), any(), any());
  }

  @Test
  @DisplayName("Closed history refuses a discovered root without writing a source")
  void refusesClosedHistory() {
    // Given
    ObserveCollectionSource.Proposal proposal = proposal();
    when(seasons.getOrCreate(2026)).thenReturn(new SeasonView(SEASON, 2026, "2026/2027"));
    when(seasons.lockCollectionState(SEASON))
        .thenReturn(
            new CollectionSeasonView(
                SEASON, "2026/2027", 2026, CollectionSeasonStateEnum.CLOSED, 4));

    // When
    ThrowingCallable observe = () -> service.observe(proposal);

    // Then
    assertThatThrownBy(observe).isInstanceOf(CollectionConflictException.class);
    verifyNoInteractions(store, events);
  }

  /** Supplies an explicitly qualified year rather than deriving it from a native identifier. */
  private ObserveCollectionSource.Proposal proposal() {
    return new ObserveCollectionSource.Proposal(
        STARTUP,
        2026,
        CollectionProviderEnum.FFVB,
        "LIRA",
        URI.create("https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=LIRA"),
        URI.create("https://www.ffvb.org/120-37-1-Championnats-Regionaux"),
        Instant.parse("2026-10-21T00:00:00Z"));
  }
}
