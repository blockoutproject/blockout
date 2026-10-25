package com.blockout.collector.acquisition.infrastructure.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.collector.generated.ingestion.model.ResultStateEnum;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;

/** Checks concrete target presence states independently from JSON transport serialization. */
@DisplayName("Sporting proposal presence mapping")
class SportingObservationMapperTest {
  @Test
  @DisplayName("Maps absent, withdrawn, empty and supplied proposals to the transport model")
  void preservesMixedPresence() {
    // Given
    SportingObservation.Facts facts =
        SportingObservation.Facts.builder()
            .localTime(JsonNullable.of(null))
            .sets(JsonNullable.of(List.of()))
            .result(
                JsonNullable.of(
                    new SportingObservation.Result(ResultStateEnum.UNCONFIRMED, null, null, "F/F")))
            .informationSheet(
                JsonNullable.of(
                    new SportingObservation.InformationSheet("2026/2027", "ABCD", "001")))
            .build();
    SportingObservationMapper mapper = new SportingObservationMapperImpl();

    // When
    MatchFactsInternalRequest decoded = mapper.toDto(facts);

    // Then
    assertThat(decoded.getLocalDate_JsonNullable().isPresent()).isFalse();
    assertThat(decoded.getLocalTime_JsonNullable().isPresent()).isTrue();
    assertThat(decoded.getLocalTime_JsonNullable().get()).isNull();
    assertThat(decoded.getSets_JsonNullable().get()).isEmpty();
    assertThat(decoded.getResult().getState()).isEqualTo(ResultStateEnum.UNCONFIRMED);
    assertThat(decoded.getResult().getHomeSets()).isNull();
    assertThat(decoded.getResult().getSpecialLabel()).isEqualTo("F/F");
    assertThat(decoded.getInformationSheet().getMatchCode()).isEqualTo("001");
  }
}
