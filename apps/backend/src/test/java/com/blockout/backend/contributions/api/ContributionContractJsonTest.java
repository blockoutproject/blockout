package com.blockout.backend.contributions.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.model.MatchResultResponse;
import com.blockout.backend.generated.mobile.model.MatchScheduleResponse;
import com.blockout.backend.generated.mobile.model.ModeratedStreamContributionsResponse;
import com.blockout.backend.generated.mobile.model.ResultStateEnum;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Exercises configured private omission and presence without a servlet or persistence context. */
@JsonTest
@Import(HttpConfiguration.class)
@DisplayName("Contribution generated JSON contract")
class ContributionContractJsonTest {
  private static final String ID = "00000000-0000-4000-8000-000000000223";
  private static final String VERSION =
      """
      {"id":"%s","url":"https://youtube.com/watch?v=synthetic#part","platform":"youtube",
       "state":"hidden","submittedAt":"2026-10-24T12:00:00Z","reportCount":9007199254740991,
       "canApprove":false,"canReject":false,"canWithdraw":false,"canReactivate":true,
       "decisions":[{"kind":"hide","at":"2026-10-24T12:00:00Z"}]}
      """
          .formatted(ID);
  private static final String PRIVATE_CONTEXT =
      """
      {"revision":"opaque:α/not-a-counter","match":{
       "id":"%1$s","seasonId":"%1$s","home":{"id":"%1$s","name":"Home"},
       "away":{"id":"%1$s","name":"Away"},"pool":{"pool":{"id":"%1$s","name":"Pool"},
       "season":{"id":"%1$s","label":"2026/27","startYear":2026},"classification":{}},
       "publiclyViewable":false},"counts":{"active":0,"pending":0,"hidden":1,
       "reports":0,"rejected":0},"approvalRequiredAfterReports":true,
       "canPublish":false,"items":[%2$s]}
      """
          .formatted(ID, VERSION);
  @Autowired private JsonMapper mapper;

  @Test
  @DisplayName("Omits erased names and unknown sporting facts from the private context")
  void preservesPrivatePresence() {
    // Given
    ModeratedStreamContributionsResponse response =
        mapper.readValue(PRIVATE_CONTEXT, ModeratedStreamContributionsResponse.class);

    // When
    JsonNode json = mapper.readTree(mapper.writeValueAsString(response));

    // Then
    assertThat(json.path("match").has("schedule")).isFalse();
    assertThat(json.path("match").has("result")).isFalse();
    assertThat(json.path("items").get(0).has("authorName")).isFalse();
    assertThat(json.path("items").get(0).path("decisions").get(0).has("actorName")).isFalse();
  }

  @Test
  @DisplayName("Preserves optional genuine private date and result without inventing a kickoff")
  void acceptsPrivateSportingFacts() {
    // Given
    ModeratedStreamContributionsResponse response =
        mapper.readValue(PRIVATE_CONTEXT, ModeratedStreamContributionsResponse.class);
    response
        .getMatch()
        .setSchedule(
            new MatchScheduleResponse(
                    java.time.LocalDate.of(2026, 10, 24),
                    java.time.OffsetDateTime.parse("2026-10-24T12:00:00Z"))
                .timeZone("Europe/Paris"));
    response
        .getMatch()
        .setResult(
            new MatchResultResponse(
                    ResultStateEnum.FINAL, java.time.OffsetDateTime.parse("2026-10-24T12:00:00Z"))
                .specialLabel("Forfeit"));

    // When
    JsonNode json = mapper.readTree(mapper.writeValueAsString(response));

    // Then
    assertThat(json.path("match").path("publiclyViewable").isBoolean()).isTrue();
    assertThat(json.path("match").path("publiclyViewable").asBoolean()).isFalse();
    assertThat(json.path("match").path("schedule").path("localDate").asString())
        .isEqualTo("2026-10-24");
    assertThat(json.path("match").path("schedule").has("instant")).isFalse();
    assertThat(json.path("match").path("result").path("state").asString()).isEqualTo("final");
  }
}
