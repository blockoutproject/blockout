package com.blockout.backend.notifications.api;

import static com.blockout.backend.notifications.api.NotificationContractFixture.ID;
import static com.blockout.backend.notifications.api.NotificationContractFixture.entry;
import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.model.NotificationFamilyEnum;
import com.blockout.backend.generated.mobile.model.NotificationResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Exercises configured Jackson precision and sporting absences without servlet or persistence. */
@JsonTest
@Import(HttpConfiguration.class)
@DisplayName("Notification generated JSON contract")
class NotificationContractJsonTest {
  @Autowired private JsonMapper json;

  @Test
  @DisplayName("Preserves original microseconds and meaningful sporting absences")
  void preservesSportingPresence() throws Exception {
    // Given
    NotificationResponse entry = entry(NotificationFamilyEnum.RESULT);
    entry.putAdditionalProperty("future", true);
    entry.getMatch().putAdditionalProperty("future", true);

    // When
    JsonNode encoded = json.readTree(json.writeValueAsString(entry));

    // Then
    assertThat(encoded.path("family").asString()).isEqualTo("result");
    assertThat(encoded.path("id").asString()).isEqualTo(ID.toString());
    assertThat(encoded.path("createdAt").asString()).isEqualTo("2026-10-24T01:02:03.123456Z");
    assertThat(encoded.at("/match/result/homeSets").isMissingNode()).isTrue();
    assertThat(encoded.at("/match/schedule/instant").isMissingNode()).isTrue();
    assertThat(encoded.at("/match/schedule/localDate").asString()).isEqualTo("2026-10-24");
    assertThat(encoded.at("/division/gradient").isNull()).isTrue();
    assertThat(encoded.path("future").asBoolean()).isTrue();
    assertThat(encoded.at("/match/future").asBoolean()).isTrue();
  }
}
