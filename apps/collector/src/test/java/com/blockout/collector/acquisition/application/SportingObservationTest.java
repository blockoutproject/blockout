package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.collector.generated.ingestion.model.StandingsPublicationStateEnum;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Protects application observation invariants independently of generated transport and HTTP. */
@DisplayName("Sporting observation invariants")
class SportingObservationTest {
  @Test
  @DisplayName("Rejects an unpublished standings table with published columns")
  void rejectsContradictoryStandings() {
    // Given
    List<String> columns = List.of("Points");

    // When / Then
    assertThatThrownBy(
            () ->
                new SportingObservation.Standings(
                    StandingsPublicationStateEnum.NOT_PUBLISHED, columns, List.of()))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
