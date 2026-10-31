package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.MatchDocumentKindEnum;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.MatchDetails;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

/**
 * Current F02 values are real immutable examples; only persistence and PDF transport are doubles.
 */
@DisplayName("Current match document eligibility")
class ReadMatchDocumentTest {
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000259");
  private final ReadSportingData owners = mock(ReadSportingData.class);
  private final SportingStore store = mock(SportingStore.class);
  private final MatchDocumentSource source = mock(MatchDocumentSource.class);
  private final PlatformTransactionManager transactions = mock(PlatformTransactionManager.class);
  private final ReadMatchDocument reader =
      new ReadMatchDocument(owners, store, source, transactions);

  @ParameterizedTest
  @EnumSource(ResultStateEnum.class)
  @DisplayName(
      "Keeps information independent while requiring final results for professional result documents")
  void appliesCurrentFinality(ResultStateEnum state) {
    // Given
    visible(CollectionProviderEnum.LNV);
    MatchDetails details =
        MatchDetails.builder()
            .id(ID)
            .informationSheet(new MatchObservation.InformationSheet("2026/2027", "AALNV", "DOC259"))
            .scoresheetUrl("https://documents.example.invalid/score.pdf")
            .statisticsUrl("https://documents.example.invalid/stats.pdf")
            .result(new MatchObservation.Result(state, null, null, "Forfeit"))
            .build();
    when(store.matchDetails(ID)).thenReturn(details);

    // When
    List<ConsultationViews.Document> actions = reader.actions(ID);

    // Then
    assertThat(actions)
        .extracting(ConsultationViews.Document::kind)
        .containsExactlyElementsOf(
            state == ResultStateEnum.FINAL
                ? List.of(
                    MatchDocumentKindEnum.INFORMATION,
                    MatchDocumentKindEnum.SCORESHEET,
                    MatchDocumentKindEnum.STATISTICS)
                : List.of(MatchDocumentKindEnum.INFORMATION));
    assertThat(actions)
        .allSatisfy(
            action ->
                assertThat(action.url())
                    .isEqualTo("/matches/" + ID + "/documents/" + action.kind().getValue()));
    verifyNoInteractions(source);
  }

  @Test
  @DisplayName("Does not infer missing references or amateur statistics from a final score")
  void refusesMissingReferences() {
    // Given
    visible(CollectionProviderEnum.FFVB);
    when(store.matchDetails(ID))
        .thenReturn(
            MatchDetails.builder()
                .id(ID)
                .result(new MatchObservation.Result(ResultStateEnum.FINAL, 3, 0, null))
                .statisticsUrl("https://documents.example.invalid/stats.pdf")
                .build());

    // When
    List<ConsultationViews.Document> actions = reader.actions(ID);

    // Then
    assertThat(actions).isEmpty();
    assertThatThrownBy(() -> reader.read(ID, MatchDocumentKindEnum.STATISTICS))
        .isInstanceOf(SportingResourceNotFoundException.class);
    verifyNoInteractions(source);
  }

  @Test
  @DisplayName("Rejects an unavailable match before fetching retained references")
  void refusesHiddenMatch() {
    // Given
    when(owners.publicMatch(ID)).thenReturn(Optional.empty());
    when(transactions.getTransaction(org.mockito.ArgumentMatchers.any()))
        .thenReturn(new SimpleTransactionStatus());

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> reader.read(ID, MatchDocumentKindEnum.INFORMATION);

    // Then
    assertThatThrownBy(read).isInstanceOf(SportingResourceNotFoundException.class);
    verifyNoInteractions(store, source);
  }

  /**
   * Supplies exact visible identities without inventing a schedule or source association.
   *
   * @param provider explicit professional or amateur authority for the scenario
   */
  private void visible(CollectionProviderEnum provider) {
    when(transactions.getTransaction(org.mockito.ArgumentMatchers.any()))
        .thenReturn(new SimpleTransactionStatus());
    when(owners.publicMatch(ID)).thenReturn(Optional.of(new MatchView(ID, ID, "MATCH259", ID, ID)));
    when(store.pool(ID))
        .thenReturn(
            Optional.of(
                new PoolView(
                    ID,
                    new PoolKey(provider, ID, "ORGANIZER", "COMP", null, null, "POOL259"),
                    ID,
                    "Pool",
                    null)));
  }
}
