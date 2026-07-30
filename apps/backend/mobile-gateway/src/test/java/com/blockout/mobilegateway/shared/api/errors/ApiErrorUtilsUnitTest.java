package com.blockout.mobilegateway.shared.api.errors;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("API error JSON utilities")
class ApiErrorUtilsUnitTest {

  @Test
  @DisplayName("reads stable fields from an error payload")
  void readsStableFieldsFromAnErrorPayload() {
    String payload =
        """
            {
              "message": "Competition not found",
              "code": "competition_not_found"
            }
            """;

    assertThat(ApiErrorUtils.extractMessage(payload)).isEqualTo("Competition not found");
    assertThat(ApiErrorUtils.extractCode(payload)).isEqualTo("competition_not_found");
  }

  @Test
  @DisplayName("returns null for malformed JSON")
  void returnsNullForMalformedJson() {
    assertThat(ApiErrorUtils.extractMessage("not-json")).isNull();
    assertThat(ApiErrorUtils.extractCode("not-json")).isNull();
  }
}
