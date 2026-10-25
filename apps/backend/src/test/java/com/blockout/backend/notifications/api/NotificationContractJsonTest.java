package com.blockout.backend.notifications.api;

import static com.blockout.backend.notifications.api.NotificationContractFixture.ID;
import static com.blockout.backend.notifications.api.NotificationContractFixture.entry;
import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.model.NotificationFamilyEnum;
import com.blockout.backend.generated.mobile.model.NotificationResponse;
import com.blockout.backend.generated.mobile.model.NotificationSummaryResponse;
import com.blockout.backend.generated.mobile.model.NotificationsResponse;
import jakarta.validation.Validator;
import java.util.ArrayList;
import java.util.List;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Exercises configured Jackson and generated validation without a servlet or persistence context.
 */
@JsonTest
@Import(HttpConfiguration.class)
@ImportAutoConfiguration(ValidationAutoConfiguration.class)
@DisplayName("Notification generated JSON contract")
class NotificationContractJsonTest {
  @Autowired private JsonMapper json;
  @Autowired private Validator validator;

  @ParameterizedTest
  @ValueSource(strings = {"result", "result-with-link", "live-link", "post-result-link"})
  @DisplayName(
      "Serializes each finite family with original microseconds and shared sporting values")
  void serializesFamily(String family) throws Exception {
    // Given
    NotificationResponse entry = entry(NotificationFamilyEnum.fromValue(family));
    entry.putAdditionalProperty("future", true);
    entry.getMatch().putAdditionalProperty("future", true);

    // When
    JsonNode encoded = json.readTree(json.writeValueAsString(entry));

    // Then
    assertThat(encoded.path("family").asString()).isEqualTo(family);
    assertThat(encoded.path("id").asString()).isEqualTo(ID.toString());
    assertThat(encoded.path("createdAt").asString()).isEqualTo("2026-10-24T01:02:03.123456Z");
    assertThat(encoded.at("/match/result/homeSets").isMissingNode()).isTrue();
    assertThat(encoded.at("/match/schedule/instant").isMissingNode()).isTrue();
    assertThat(encoded.at("/match/schedule/localDate").asString()).isEqualTo("2026-10-24");
    assertThat(encoded.at("/division/gradient").isNull()).isTrue();
    assertThat(encoded.path("future").asBoolean()).isTrue();
    assertThat(encoded.at("/match/future").asBoolean()).isTrue();
    assertThat(validator.validate(entry)).isEmpty();
  }

  @Test
  @DisplayName("Rejects unknown families without inventing compatibility")
  void rejectsUnknownFamily() {
    // Given
    String unknown = "\"future\"";

    // When
    ThrowingCallable decode = () -> json.readValue(unknown, NotificationFamilyEnum.class);

    // Then
    org.assertj.core.api.Assertions.assertThatThrownBy(decode)
        .isInstanceOf(tools.jackson.core.JacksonException.class);
  }

  @Test
  @DisplayName("Omits expiry for a zero-count summary")
  void omitsZeroExpiry() {
    // Given
    NotificationSummaryResponse summary = new NotificationSummaryResponse(0L);

    // When
    JsonNode encoded = json.readTree(json.writeValueAsString(summary));

    // Then
    assertThat(encoded.path("unreadCount").isIntegralNumber()).isTrue();
    assertThat(encoded.path("unreadCount").asLong()).isZero();
    assertThat(encoded.path("nextExpiryAt").isMissingNode()).isTrue();
  }

  @Test
  @DisplayName("Rejects arrays beyond twenty entries through generated constraints")
  void validatesPageBound() {
    // Given
    List<NotificationResponse> entries =
        new ArrayList<>(java.util.Collections.nCopies(20, entry(NotificationFamilyEnum.RESULT)));

    // When
    boolean twentyValid = validator.validate(new NotificationsResponse(entries)).isEmpty();
    entries.add(entry(NotificationFamilyEnum.RESULT));
    boolean twentyOneValid = validator.validate(new NotificationsResponse(entries)).isEmpty();

    // Then
    assertThat(twentyValid).isTrue();
    assertThat(twentyOneValid).isFalse();
  }

  @Test
  @DisplayName("Rejects negative counts through generated constraints")
  void validatesSummaryBound() {
    // Given
    NotificationSummaryResponse summary = new NotificationSummaryResponse(-1L);

    // When
    boolean valid = validator.validate(summary).isEmpty();

    // Then
    assertThat(valid).isFalse();
  }
}
