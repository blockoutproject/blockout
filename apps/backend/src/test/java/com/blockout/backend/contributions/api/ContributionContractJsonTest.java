package com.blockout.backend.contributions.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.model.MatchResultResponse;
import com.blockout.backend.generated.mobile.model.MatchScheduleResponse;
import com.blockout.backend.generated.mobile.model.ModeratedStreamContributionsResponse;
import com.blockout.backend.generated.mobile.model.OwnStreamContributionsResponse;
import com.blockout.backend.generated.mobile.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.StreamReportsResponse;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.context.annotation.Import;
import tools.jackson.core.JacksonException;
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
       "decisions":[{"kind":"hide","at":"2026-10-24T12:00:00Z","future":true}],"future":true}
      """
          .formatted(ID);
  private static final String PRIVATE_CONTEXT =
      """
      {"revision":"opaque:α/not-a-counter","match":{
       "id":"%1$s","seasonId":"%1$s","home":{"id":"%1$s","name":"Home","future":true},
       "away":{"id":"%1$s","name":"Away"},"pool":{"pool":{"id":"%1$s","name":"Pool"},
       "season":{"id":"%1$s","label":"2026/27","startYear":2026},"classification":{}},
       "publiclyViewable":false},"counts":{"active":0,"pending":9007199254740991,"hidden":1,
       "reports":9007199254740991,"rejected":9007199254740991},"approvalRequiredAfterReports":true,
       "canPublish":false,"items":[%2$s],"future":true}
      """
          .formatted(ID, VERSION);
  private static final String OWN_COLLECTION =
      """
      {"revision":"current","eligibility":{"canSubmit":true,"requiresApproval":false},
       "quota":{"versionsUsed":0,"dailyMatchesUsed":0,"matchCountedToday":false,
       "dayEndsAt":"2026-10-24T22:00:00Z"},"items":[]%s}
      """;
  @Autowired private JsonMapper mapper;

  @Test
  @DisplayName("Retains additive private fields and omits erased names and unknown sporting facts")
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
    assertThat(json.path("future").asBoolean()).isTrue();
    assertThat(json.path("match").path("home").path("future").asBoolean()).isTrue();
    assertThat(response.getCounts().getReports()).isEqualTo(9007199254740991L);
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
    assertThat(response.getMatch().getSchedule().getInstant()).isNull();
    assertThat(response.getMatch().getPubliclyViewable()).isFalse();
    assertThat(json.path("match").path("schedule").path("localDate").asString())
        .isEqualTo("2026-10-24");
    assertThat(json.path("match").path("schedule").has("instant")).isFalse();
    assertThat(json.path("match").path("result").path("state").asString()).isEqualTo("final");
  }

  @ParameterizedTest
  @ValueSource(strings = {"authorName", "sourceVersionId", "replacedByVersionId"})
  @DisplayName("Rejects null optional attribution instead of treating it as omission")
  void refusesNullAttribution(String field) {
    // Given
    String body =
        PRIVATE_CONTEXT.replace(
            "\"state\":\"hidden\"", "\"" + field + "\":null,\"state\":\"hidden\"");

    // When / Then
    assertThatThrownBy(() -> mapper.readValue(body, ModeratedStreamContributionsResponse.class))
        .isInstanceOf(JacksonException.class);
  }

  @Test
  @DisplayName("Requires an erased report reason as explicit null and retains counted facts")
  void preservesErasedReason() {
    // Given
    String body =
        "{\"count\":9007199254740991,\"items\":[{\"id\":\""
            + ID
            + "\",\"reportedAt\":\"2026-10-24T12:00:00Z\",\"reason\":null}]}";

    // When
    StreamReportsResponse response = mapper.readValue(body, StreamReportsResponse.class);

    // Then
    assertThat(
            mapper
                .readTree(mapper.writeValueAsString(response))
                .path("items")
                .get(0)
                .get("reason")
                .isNull())
        .isTrue();
    assertThatThrownBy(
            () ->
                mapper.readValue(body.replace(",\"reason\":null", ""), StreamReportsResponse.class))
        .isInstanceOf(JacksonException.class);
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Preserves an optional active member independently of the empty loaded page")
  void preservesActiveMemberPresence(boolean present) {
    // Given
    String active =
        """
        ,"activeContribution":{"id":"%s","url":"https://youtu.be/active","platform":"youtube",
        "state":"active","submittedAt":"2026-10-24T12:00:00Z","canWithdraw":true}
        """
            .formatted(ID);
    String body = OWN_COLLECTION.formatted(",\"proposalCount\":1" + (present ? active : ""));

    // When
    OwnStreamContributionsResponse response =
        mapper.readValue(body, OwnStreamContributionsResponse.class);
    JsonNode json = mapper.readTree(mapper.writeValueAsString(response));

    // Then
    assertThat(json.has("activeContribution")).isEqualTo(present);
    assertThat(response.getItems()).isEmpty();
    if (present) {
      assertThat(response.getActiveContribution().getId()).isEqualTo(UUID.fromString(ID));
      assertThat(response.getActiveContribution().getCanWithdraw()).isTrue();
    }
  }
}
