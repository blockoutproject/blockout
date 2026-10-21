package com.blockout.backend.collection.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.collection.application.service.CollectionSourceService;
import com.blockout.backend.collection.application.service.CollectorRuntimeService;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.service.SeasonService;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Discovery decisions with controlled owner ports; database atomicity is qualified separately. */
@ExtendWith(MockitoExtension.class)
class CollectionSourceServiceTest {
  private static final UUID STARTUP = UUID.fromString("00000000-0000-4000-8000-000000000171");
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000172");
  private static final UUID SOURCE = UUID.fromString("00000000-0000-4000-8000-000000000173");
  @Mock private CollectionStore store;
  @Mock private CollectorRuntimeService runtimes;
  @Mock private SeasonService seasons;
  @InjectMocks private CollectionSourceService service;

  @Test
  @DisplayName("A repeated discovery preserves the operator candidate and active season")
  void preservesOperatorCandidate() {
    // Given
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
    when(store.sources(SEASON)).thenReturn(List.of(existing));

    // When
    CollectionSourceService.Resolved result = service.observe(proposal());

    // Then
    assertThat(result).isEqualTo(new CollectionSourceService.Resolved(SEASON, SOURCE));
    verify(store, never()).createSource(any(), any(), any(), any());
  }

  @Test
  @DisplayName("Closed history refuses a discovered root without writing a source")
  void refusesClosedHistory() {
    // Given
    when(seasons.getOrCreate(2026)).thenReturn(new SeasonView(SEASON, 2026, "2026/2027"));
    when(seasons.lockCollectionState(SEASON))
        .thenReturn(
            new CollectionSeasonView(
                SEASON, "2026/2027", 2026, CollectionSeasonStateEnum.CLOSED, 4));

    // When / Then
    assertThatThrownBy(() -> service.observe(proposal()))
        .isInstanceOf(CollectionConflictException.class);
    verifyNoInteractions(store);
  }

  /** Supplies an explicitly qualified year rather than deriving it from a native identifier. */
  private CollectionSourceService.Proposal proposal() {
    return new CollectionSourceService.Proposal(
        STARTUP,
        2026,
        CollectionProviderEnum.FFVB,
        "LIRA",
        URI.create("https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=LIRA"),
        URI.create("https://www.ffvb.org/120-37-1-Championnats-Regionaux"),
        Instant.parse("2026-10-21T00:00:00Z"));
  }
}
