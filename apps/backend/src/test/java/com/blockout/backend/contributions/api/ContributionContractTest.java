package com.blockout.backend.contributions.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.api.StreamSubmissionApi;
import com.blockout.backend.generated.mobile.model.CreateModeratedStreamContributionRequest;
import com.blockout.backend.generated.mobile.model.CreateStreamContributionRequest;
import com.blockout.backend.generated.mobile.model.CreateStreamReactivationRequest;
import com.blockout.backend.generated.mobile.model.CreateStreamReportRequest;
import com.blockout.backend.generated.mobile.model.MatchDetailResponse;
import com.blockout.backend.generated.mobile.model.MatchResultResponse;
import com.blockout.backend.generated.mobile.model.MatchScheduleResponse;
import com.blockout.backend.generated.mobile.model.ModeratedStreamContributionsResponse;
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
import com.blockout.backend.generated.mobile.model.UpdateModeratedStreamContributionRequest;
import com.blockout.backend.generated.mobile.model.UpdateOwnStreamContributionRequest;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import java.lang.reflect.Method;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Real generated Java DTO binding, serialization and constraints, through test-scoped MVC adapters.
 * These probes implement no contribution endpoint or response business invariant. Mobile tests
 * exercise actual generated Fetch validation; output Bean Validation here is an explicit test call.
 */
@WebMvcTest(controllers = ContributionContractTest.BindingAdapter.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  ContributionContractTest.BindingAdapter.class
})
@DisplayName("Generated contribution contract consumers")
class ContributionContractTest {
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
  @Autowired private MockMvc mvc;
  @Autowired private JsonMapper mapper;
  @Autowired private Validator validator;

  /**
   * Supplies complete requests with decisive command fields visible.
   *
   * @return route and valid body for each generated command
   */
  static Stream<Arguments> commands() {
    return Stream.of(
        Arguments.of(
            "submit", "{\"revision\":\"opaque:a\",\"url\":\"https://twitch.tv/synthetic\"}"),
        Arguments.of("owner", "{\"revision\":\"opaque:a\",\"action\":\"cancel\"}"),
        Arguments.of(
            "publish",
            "{\"actorAccountId\":\""
                + ID
                + "\",\"revision\":\"opaque:a\",\"url\":\"https://fb.watch/synthetic\"}"),
        Arguments.of(
            "moderate",
            "{\"actorAccountId\":\"" + ID + "\",\"revision\":\"opaque:a\",\"action\":\"approve\"}"),
        Arguments.of("reactivate", "{\"actorAccountId\":\"" + ID + "\",\"revision\":\"opaque:a\"}"),
        Arguments.of("report", "{\"reason\":\"Synthetic reason\"}"));
  }

  @ParameterizedTest
  @MethodSource("commands")
  @DisplayName("Binds complete generated commands and rejects unknown, absent and null fields")
  void bindsStrictCommands(String route, String body) throws Exception {
    // Given
    JsonNode fields = mapper.readTree(body);

    // When
    ResultActions valid =
        mvc.perform(
            post("/contract/" + route).contentType(MediaType.APPLICATION_JSON).content(body));

    // Then
    valid.andExpect(status().isOk());
    mvc.perform(
            post("/contract/" + route)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body.replaceFirst("\\{", "{\"future\":true,")))
        .andExpect(status().isBadRequest());
    for (String field : fields.propertyNames()) {
      tools.jackson.databind.node.ObjectNode missing =
          (tools.jackson.databind.node.ObjectNode) mapper.readTree(body);
      missing.remove(field);
      mvc.perform(
              post("/contract/" + route)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(missing.toString()))
          .andExpect(status().isBadRequest());
      tools.jackson.databind.node.ObjectNode nulled =
          (tools.jackson.databind.node.ObjectNode) mapper.readTree(body);
      nulled.putNull(field);
      mvc.perform(
              post("/contract/" + route)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(nulled.toString()))
          .andExpect(status().isBadRequest());
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "0", "opaque:α/not-a-counter"})
  @DisplayName("Treats revisions as opaque nonempty strings")
  void bindsOpaqueRevision(String revision) throws Exception {
    // Given
    String body =
        mapper.writeValueAsString(
            new CreateStreamContributionRequest(
                revision, java.net.URI.create("https://twitch.tv/synthetic")));

    // When
    ResultActions result =
        mvc.perform(post("/contract/submit").contentType(MediaType.APPLICATION_JSON).content(body));

    // Then
    if (revision.isEmpty()) result.andExpect(status().isBadRequest());
    else result.andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(revision));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"revision\":1,\"action\":\"cancel\"}",
        "{\"revision\":\"a\",\"action\":\"unknown\"}"
      })
  @DisplayName("Refuses numeric revisions and unknown owner actions")
  void refusesInvalidCommandConcepts(String body) throws Exception {
    // Given
    // When
    ResultActions result =
        mvc.perform(post("/contract/owner").contentType(MediaType.APPLICATION_JSON).content(body));

    // Then
    result.andExpect(status().isBadRequest());
  }

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

    // When
    // Then
    for (Class<?> type : enums) {
      assertThatThrownBy(() -> mapper.readValue("\"unknown\"", type))
          .isInstanceOf(JacksonException.class);
      for (Object value : type.getEnumConstants())
        assertThat(mapper.readValue(mapper.writeValueAsString(value), type)).isEqualTo(value);
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
                "Europe/Paris",
                java.time.OffsetDateTime.parse("2026-10-24T12:00:00Z")));
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
    // Then
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
    // Given: pair selection is future F03/F08 business mapping, not a DTO cross-field validator.
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

  /** Exposes real generated request DTOs without implementing any future business endpoint. */
  @RestController
  static class BindingAdapter {
    /**
     * Binds a complete ordinary proposal; generated validation owns field constraints.
     *
     * @param body generated command validated by MVC
     * @return unchanged bound command
     */
    @PostMapping("/contract/submit")
    CreateStreamContributionRequest submit(
        @Valid @RequestBody CreateStreamContributionRequest body) {
      return body;
    }

    /**
     * Binds a complete owner transition for one viewed version.
     *
     * @param body generated command validated by MVC
     * @return unchanged bound command
     */
    @PostMapping("/contract/owner")
    UpdateOwnStreamContributionRequest owner(
        @Valid @RequestBody UpdateOwnStreamContributionRequest body) {
      return body;
    }

    /**
     * Binds original actor, revision and address for direct publication.
     *
     * @param body generated command validated by MVC
     * @return unchanged bound command
     */
    @PostMapping("/contract/publish")
    CreateModeratedStreamContributionRequest publish(
        @Valid @RequestBody CreateModeratedStreamContributionRequest body) {
      return body;
    }

    /**
     * Binds an exact moderator decision without applying effects.
     *
     * @param body generated command validated by MVC
     * @return unchanged bound command
     */
    @PostMapping("/contract/moderate")
    UpdateModeratedStreamContributionRequest moderate(
        @Valid @RequestBody UpdateModeratedStreamContributionRequest body) {
      return body;
    }

    /**
     * Binds a historical source reactivation command without creating a version.
     *
     * @param body generated command validated by MVC
     * @return unchanged bound command
     */
    @PostMapping("/contract/reactivate")
    CreateStreamReactivationRequest reactivate(
        @Valid @RequestBody CreateStreamReactivationRequest body) {
      return body;
    }

    /**
     * Binds the report reason; business whitespace policy belongs to the later report use case.
     *
     * @param body generated command validated by MVC
     * @return unchanged bound command
     */
    @PostMapping("/contract/report")
    CreateStreamReportRequest report(@Valid @RequestBody CreateStreamReportRequest body) {
      return body;
    }
  }
}
