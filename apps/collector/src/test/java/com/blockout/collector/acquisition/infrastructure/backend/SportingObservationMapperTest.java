package com.blockout.collector.acquisition.infrastructure.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.generated.ingestion.ApiClient;
import com.blockout.collector.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.collector.generated.ingestion.model.ResultStateEnum;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;
import tools.jackson.databind.json.JsonMapper;

/**
 * Uses the real mapper and generated client's native JsonNullable module for mixed proposal states.
 */
@DisplayName("Sporting proposal presence mapping")
class SportingObservationMapperTest {
  @Test
  @DisplayName("Retains absent, withdrawn, empty and supplied proposals through JSON round-trip")
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
    JsonMapper json = ApiClient.createDefaultMapper(null);

    // When
    String encoded = json.writeValueAsString(mapper.toDto(facts));
    MatchFactsInternalRequest decoded = json.readValue(encoded, MatchFactsInternalRequest.class);

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
