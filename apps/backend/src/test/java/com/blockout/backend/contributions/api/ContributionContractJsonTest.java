package com.blockout.backend.contributions.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.api.StreamSubmissionApi;
import com.blockout.backend.generated.mobile.model.MatchDetailResponse;
import com.blockout.backend.generated.mobile.model.MatchResultResponse;
import com.blockout.backend.generated.mobile.model.MatchScheduleResponse;
import com.blockout.backend.generated.mobile.model.ModeratedStreamContributionsResponse;
import com.blockout.backend.generated.mobile.model.OwnStreamContributionsResponse;
import com.blockout.backend.generated.mobile.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.StreamContributionStateEnum;
import com.blockout.backend.generated.mobile.model.StreamDecisionEnum;
import com.blockout.backend.generated.mobile.model.StreamModerationActionEnum;
import com.blockout.backend.generated.mobile.model.StreamModerationCountsResponse;
import com.blockout.backend.generated.mobile.model.StreamModerationFilterEnum;
import com.blockout.backend.generated.mobile.model.StreamOwnerActionEnum;
import com.blockout.backend.generated.mobile.model.StreamPlatformEnum;
import com.blockout.backend.generated.mobile.model.StreamReportsResponse;
import com.blockout.backend.generated.mobile.model.StreamVersionFilterEnum;
import jakarta.validation.Validator;
import java.lang.reflect.Method;
import java.util.List;
import java.util.UUID;
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
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Exercises configured Jackson and explicit generated validation without a servlet or persistence
 * context. Executable validation inspects the generated interface constraints; its mock target is
 * never invoked and supplies no HTTP dispatch or business evidence.
 */
@JsonTest
@Import(HttpConfiguration.class)
@ImportAutoConfiguration(ValidationAutoConfiguration.class)
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
  @Autowired private Validator validator;

  @Test
  @DisplayName("Keeps every canonical stream vocabulary finite in Java")
  void rejectsUnknownEnums() {
    // Given
    List<Class<?>> enums =
        List.of(
            StreamPlatformEnum.class,
            StreamContributionStateEnum.class,
            StreamModerationFilterEnum.class,
            StreamVersionFilterEnum.class,
            StreamOwnerActionEnum.class,
            StreamModerationActionEnum.class,
            StreamDecisionEnum.class);

    for (Class<?> type : enums) {
      // When
      ThrowingCallable decodeUnknown = () -> mapper.readValue("\"unknown\"", type);

      // Then
      assertThatThrownBy(decodeUnknown).isInstanceOf(JacksonException.class);
      for (Object value : type.getEnumConstants()) {
        // When
        Object decoded = mapper.readValue(mapper.writeValueAsString(value), type);

        // Then
        assertThat(decoded).isEqualTo(value);
      }
    }
  }

  @Test
  @DisplayName("Retains additive private fields and omits erased names and unknown sporting facts")
  void preservesPrivatePresence() {
    // Given
    ModeratedStreamContributionsResponse response =
        mapper.readValue(PRIVATE_CONTEXT, ModeratedStreamContributionsResponse.class);

    // When
    JsonNode json = mapper.readTree(mapper.writeValueAsString(response));

    // Then
    assertThat(validator.validate(response)).isEmpty();
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
    assertThat(validator.validate(response)).isEmpty();
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

    // When
    ThrowingCallable decode =
        () -> mapper.readValue(body, ModeratedStreamContributionsResponse.class);

    // Then
    assertThatThrownBy(decode).isInstanceOf(JacksonException.class);
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
    assertThat(validator.validate(response)).isEmpty();
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
  @ValueSource(longs = {-1, 9007199254740992L})
  @DisplayName("Rejects out-of-range counts through generated Bean Validation")
  void rejectsUnsafeCounts(long count) {
    // Given
    StreamModerationCountsResponse response =
        new StreamModerationCountsResponse(0, count, 0, count, count);

    // When
    boolean valid = validator.validate(response).isEmpty();

    // Then
    assertThat(valid).isFalse();
  }

  @ParameterizedTest
  @ValueSource(longs = {-1, 9007199254740992L})
  @DisplayName("Rejects proposal counts outside the shared safe integer range")
  void rejectsUnsafeProposalCount(long count) {
    // Given
    OwnStreamContributionsResponse response =
        mapper.readValue(
            OWN_COLLECTION.formatted(",\"proposalCount\":" + count),
            OwnStreamContributionsResponse.class);

    // When
    boolean valid = validator.validate(response).isEmpty();

    // Then
    assertThat(valid).isFalse();
  }

  @ParameterizedTest
  @ValueSource(longs = {0, 9007199254740991L})
  @DisplayName("Preserves exact safe proposal count boundaries independently of an empty page")
  void preservesSafeProposalCount(long count) {
    // Given
    OwnStreamContributionsResponse response =
        mapper.readValue(
            OWN_COLLECTION.formatted(",\"proposalCount\":" + count),
            OwnStreamContributionsResponse.class);

    // When
    JsonNode json = mapper.readTree(mapper.writeValueAsString(response));

    // Then
    assertThat(validator.validate(response)).isEmpty();
    assertThat(json.path("proposalCount").asLong()).isEqualTo(count);
  }

  @Test
  @DisplayName("Rejects an absent proposal count through required generated constructor binding")
  void rejectsAbsentProposalCount() {
    // Given
    String body = OWN_COLLECTION.formatted("");

    // When
    ThrowingCallable decode = () -> mapper.readValue(body, OwnStreamContributionsResponse.class);

    // Then
    assertThatThrownBy(decode).isInstanceOf(JacksonException.class);
  }

  @Test
  @DisplayName("Requires a nonnull proposal count even when the collection is empty")
  void rejectsNullProposalCount() {
    // Given
    OwnStreamContributionsResponse response =
        mapper.readValue(
            OWN_COLLECTION.formatted(",\"proposalCount\":null"),
            OwnStreamContributionsResponse.class);

    // When
    boolean valid = validator.validate(response).isEmpty();

    // Then
    assertThat(valid).isFalse();
  }

  @ParameterizedTest
  @ValueSource(longs = {0, 107374182, -1, 107374183})
  @DisplayName("Applies the generated twenty-item offset bound to page inputs")
  void validatesNativePage(long page) throws Exception {
    // Given: the generated interface owns these constraints; no copied annotation or endpoint.
    StreamSubmissionApi consumer = org.mockito.Mockito.mock(StreamSubmissionApi.class);
    Method operation =
        StreamSubmissionApi.class.getMethod(
            "listOwnStreamContributions", UUID.class, UUID.class, Boolean.class, Long.class);

    // When
    boolean valid =
        validator
            .forExecutables()
            .validateParameters(
                consumer,
                operation,
                new Object[] {UUID.fromString(ID), UUID.fromString(ID), false, page})
            .isEmpty();

    // Then
    assertThat(valid).isEqualTo(page >= 0 && page <= 107374182);
  }

  @Test
  @DisplayName("Accepts twenty reports and refuses twenty-one or an overflowing continuation")
  void validatesReportPage() {
    // Given
    StreamReportsResponse response =
        new StreamReportsResponse(0L, new java.util.ArrayList<>()).nextPage(107374182L);
    for (int i = 0; i < 20; i++)
      response.addItemsItem(
          new com.blockout.backend.generated.mobile.model.StreamReportResponse(
              UUID.fromString(ID), java.time.OffsetDateTime.parse("2026-10-24T12:00:00Z"), null));

    // When
    boolean twentyValid = validator.validate(response).isEmpty();
    response.addItemsItem(response.getItems().getFirst());

    // Then
    assertThat(twentyValid).isTrue();
    assertThat(validator.validate(response)).isNotEmpty();
    response.getItems().removeLast();
    response.setNextPage(107374183L);
    assertThat(validator.validate(response)).isNotEmpty();
  }

  @Test
  @DisplayName("Serializes public contribution identity only alongside its contributed URL fixture")
  void serializesPublicStreamPair() {
    // Given: pair selection belongs to business mapping, not a DTO cross-field validator.
    MatchDetailResponse contribution =
        new MatchDetailResponse()
            .streamUrl(java.net.URI.create("https://youtube.com/watch?v=synthetic"))
            .streamContributionId(UUID.fromString(ID));
    MatchDetailResponse professional =
        new MatchDetailResponse()
            .streamUrl(java.net.URI.create("https://professional.example.invalid/watch"));
    MatchDetailResponse absent = new MatchDetailResponse();

    // When
    JsonNode contributed = mapper.readTree(mapper.writeValueAsString(contribution));
    JsonNode official = mapper.readTree(mapper.writeValueAsString(professional));
    JsonNode none = mapper.readTree(mapper.writeValueAsString(absent));

    // Then
    assertThat(contributed.path("streamContributionId").asString()).isEqualTo(ID);
    assertThat(contributed.path("streamUrl").asString())
        .isEqualTo("https://youtube.com/watch?v=synthetic");
    assertThat(official.has("streamContributionId")).isFalse();
    assertThat(none.has("streamContributionId")).isFalse();
    assertThat(none.has("streamUrl")).isFalse();
  }
}
