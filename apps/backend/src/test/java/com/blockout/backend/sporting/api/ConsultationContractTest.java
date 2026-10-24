package com.blockout.backend.sporting.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.generated.mobile.model.MatchCalendarResponse;
import com.blockout.backend.generated.mobile.model.MatchDetailResponse;
import com.blockout.backend.generated.mobile.model.MatchDocumentKindEnum;
import com.blockout.backend.generated.mobile.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.SportingDivisionResponse;
import com.blockout.backend.generated.mobile.model.StandingsAvailabilityEnum;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.ConsultationViews.Classification;
import com.blockout.backend.sporting.application.ConsultationViews.Division;
import com.blockout.backend.sporting.application.ConsultationViews.Document;
import com.blockout.backend.sporting.application.ConsultationViews.Identity;
import com.blockout.backend.sporting.application.ConsultationViews.MatchDetail;
import com.blockout.backend.sporting.application.ConsultationViews.MatchSummary;
import com.blockout.backend.sporting.application.ConsultationViews.PoolSummary;
import com.blockout.backend.sporting.application.ConsultationViews.Result;
import com.blockout.backend.sporting.application.ConsultationViews.Schedule;
import com.blockout.backend.sporting.application.ConsultationViews.Sets;
import com.blockout.backend.sporting.application.ConsultationViews.StandingRow;
import com.blockout.backend.sporting.application.ConsultationViews.Standings;
import com.blockout.backend.sporting.application.ConsultationViews.StreamLink;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import jakarta.validation.Validator;
import java.net.URI;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Real generated DTO/mapping and configured JSON boundary; story endpoints remain uninstalled. */
@WebMvcTest(controllers = ConsultationContractTest.Probe.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({HttpConfiguration.class, ConsultationContractTest.Probe.class})
@DisplayName("Consultation generated mapping boundary")
class ConsultationContractTest {
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final OffsetDateTime OBSERVED = OffsetDateTime.parse("2026-10-24T16:00:00+02:00");
  private final ConsultationApiMapper mapper = Mappers.getMapper(ConsultationApiMapper.class);
  @Autowired JsonMapper json;
  @Autowired Validator validator;

  @Test
  @DisplayName("Keeps unknown optional facts absent without manufacturing numbers or private state")
  void preservesAbsence() {
    // Given
    MatchDetail view = detail(null, null, null, null);

    // When
    MatchDetailResponse response = mapper.toResponse(view);
    JsonNode body = json.readTree(json.writeValueAsString(response));

    // Then
    assertThat(validator.validate(response)).isEmpty();
    assertThat(body.at("/match/schedule/localDate").asString()).isEqualTo("2026-10-25");
    assertThat(body.at("/match/schedule/observedAt").asString())
        .isEqualTo("2026-10-24T16:00:00+02:00");
    assertThat(body.at("/match/schedule/instant").isMissingNode()).isTrue();
    assertThat(body.at("/match/result").isMissingNode()).isTrue();
    assertThat(body.has("sets")).isFalse();
    assertThat(body.has("referees")).isFalse();
    assertThat(body.has("streamContributionId")).isFalse();
    assertThat(body.has("following")).isFalse();
    assertThat(body.has("revision")).isFalse();
    assertThat(body.has("sourceContacts")).isFalse();
    assertThat(body.get("documents").isArray()).isTrue();
    assertThat(body.get("documents").isEmpty()).isTrue();
  }

  @Test
  @DisplayName("Keeps nonnumeric official notation distinct from zero and preserves empty referees")
  void preservesSpecialResult() {
    // Given
    MatchSummary summary =
        summary(
            CalendarCategoryEnum.COMPLETED,
            new Result(ResultStateEnum.FINAL, null, null, "F", OBSERVED));
    MatchDetail view = new MatchDetail(summary, null, null, null, List.of(), null, null, List.of());

    // When
    JsonNode body = json.readTree(json.writeValueAsString(mapper.toResponse(view)));

    // Then
    assertThat(body.at("/match/result/specialLabel").asString()).isEqualTo("F");
    assertThat(body.at("/match/result/homeSets").isMissingNode()).isTrue();
    assertThat(body.at("/match/result/awaySets").isMissingNode()).isTrue();
    assertThat(body.at("/match/category").asString()).isEqualTo("completed");
    assertThat(body.get("referees").isEmpty()).isTrue();
  }

  @Test
  @DisplayName("Pairs the exact contributed version with its public URL without moderation data")
  void preservesContributedVersion() {
    // Given
    StreamLink stream = new StreamLink(URI.create("https://video.example.invalid/version"), ID);

    // When
    JsonNode body =
        json.readTree(json.writeValueAsString(mapper.toResponse(detail(stream, null, null, null))));

    // Then
    assertThat(body.get("streamUrl").asString()).isEqualTo(stream.url().toString());
    assertThat(body.get("streamContributionId").asString()).isEqualTo(ID.toString());
    assertThat(body.has("contributorAccountId")).isFalse();
    assertThat(body.has("moderationState")).isFalse();
  }

  @Test
  @DisplayName("Omits the contribution identity for a professional URL")
  void omitsProfessionalVersion() {
    // Given
    StreamLink stream =
        new StreamLink(URI.create("https://video.example.invalid/professional"), null);

    // When
    JsonNode body =
        json.readTree(json.writeValueAsString(mapper.toResponse(detail(stream, null, null, null))));

    // Then
    assertThat(body.has("streamUrl")).isTrue();
    assertThat(body.has("streamContributionId")).isFalse();
  }

  @Test
  @DisplayName("Requires a URL when carrying a contributed stream version")
  void rejectsOrphanVersion() {
    // Given / When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable create = () -> new StreamLink(null, ID);

    // Then
    assertThatThrownBy(create).isInstanceOf(NullPointerException.class);
  }

  @ParameterizedTest
  @EnumSource(MatchDocumentKindEnum.class)
  @DisplayName("Maps each distinct document kind to a backend resource")
  void mapsDocument(MatchDocumentKindEnum kind) {
    // Given
    Document document = new Document(kind, "/matches/" + ID + "/documents/" + kind.getValue());

    // When
    com.blockout.backend.generated.mobile.model.MatchDocumentResponse response =
        mapper.toResponse(document);

    // Then
    assertThat(response.getKind()).isEqualTo(kind);
    assertThat(response.getUrl()).isEqualTo(document.url());
  }

  @Test
  @DisplayName("Emits the required gradient as null and preserves exactly three configured colors")
  void mapsNullableGradient() {
    // Given
    Division plain = new Division(ID, "Division", null, "#112233", null);
    Division colored =
        new Division(ID, "Division", null, "#112233", List.of("#112233", "#223344", "#334455"));

    // When
    SportingDivisionResponse response = mapper.toResponse(plain);
    JsonNode body = json.readTree(json.writeValueAsString(response));

    // Then
    assertThat(body.has("gradient")).isTrue();
    assertThat(body.get("gradient").isNull()).isTrue();
    assertThat(mapper.toResponse(colored).getGradient().get())
        .containsExactly("#112233", "#223344", "#334455");
    assertThat(validator.validate(mapper.toResponse(colored))).isEmpty();
  }

  @ParameterizedTest
  @EnumSource(StandingsAvailabilityEnum.class)
  @DisplayName("Maps official standings availability without computing rank or statistics")
  void mapsStandings(StandingsAvailabilityEnum availability) {
    // Given
    Standings view =
        new Standings(
            ID,
            availability,
            availability == StandingsAvailabilityEnum.AVAILABLE ? OBSERVED : null,
            false,
            List.of(),
            availability == StandingsAvailabilityEnum.AVAILABLE
                ? List.of(new StandingRow("Unmatched", null, null, Map.of()))
                : List.of());

    // When
    JsonNode body = json.readTree(json.writeValueAsString(mapper.toResponse(view)));

    // Then
    assertThat(body.get("availability").asString()).isEqualTo(availability.getValue());
    assertThat(body.at("/rows/0/position").isMissingNode()).isTrue();
    assertThat(body.at("/rows/0/team").isMissingNode()).isTrue();
  }

  @Test
  @DisplayName("Accepts additive generated response properties")
  void acceptsAdditiveFields() {
    // Given
    String body =
        "{\"id\":\""
            + ID
            + "\",\"name\":\"Division\",\"color\":\"#112233\",\"gradient\":null,\"future\":true}";

    // When
    SportingDivisionResponse response = json.readValue(body, SportingDivisionResponse.class);

    // Then
    assertThat(response.getAdditionalProperty("future")).isEqualTo(true);
    assertThat(response.getGradient().isPresent()).isTrue();
    assertThat(response.getGradient().get()).isNull();
  }

  @ParameterizedTest
  @CsvSource(
      delimiter = '|',
      value = {"category|\"future\"", "category|1", "evaluatedAt|\"tomorrow\"", "nextDay|null"})
  @DisplayName("Rejects an invalid known field in an otherwise valid generated calendar")
  void rejectsKnownFields(String field, String value) {
    // Given: the complete valid control must decode before its one-field mutation is tested.
    ConsultationViews.Calendar calendar =
        new ConsultationViews.Calendar(
            CalendarCategoryEnum.UPCOMING, "Europe/Paris", OBSERVED, List.of(), null);
    String valid = json.writeValueAsString(mapper.toResponse(calendar));
    assertThat(validator.validate(json.readValue(valid, MatchCalendarResponse.class))).isEmpty();
    tools.jackson.databind.node.ObjectNode body =
        (tools.jackson.databind.node.ObjectNode) json.readTree(valid);
    body.set(field, json.readTree(value));

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable decode =
        () -> json.readValue(body.toString(), MatchCalendarResponse.class);

    // Then
    assertThatThrownBy(decode).isInstanceOf(RuntimeException.class).hasMessageContaining(field);
  }

  @Test
  @DisplayName("Detaches nested collections from projection-owned mutable inputs")
  void detachesCollections() {
    // Given
    List<String> colors = new ArrayList<>(List.of("#112233", "#223344", "#334455"));
    Division division = new Division(ID, "Division", null, "#112233", colors);

    // When
    colors.clear();

    // Then
    assertThat(division.gradient()).hasSize(3);
    assertThatThrownBy(() -> division.gradient().clear())
        .isInstanceOf(UnsupportedOperationException.class);
  }

  /**
   * Builds an eligible dated summary while keeping scenario finality and category explicit.
   *
   * @param category scenario-owned presentation category
   * @param result accepted result or unknown
   * @return public summary with deterministic sporting context
   */
  private MatchSummary summary(CalendarCategoryEnum category, Result result) {
    Identity identity = new Identity(ID, "Team", null, null);
    PoolSummary pool =
        new PoolSummary(
            new Identity(ID, "Pool", null, null),
            new SeasonView(ID, 2026, "2026/2027"),
            new Classification(null, null, null),
            null,
            null);
    return new MatchSummary(
        ID,
        pool,
        identity,
        identity,
        new Schedule(LocalDate.parse("2026-10-25"), null, "Europe/Paris", OBSERVED),
        category,
        result);
  }

  /**
   * Builds public detail with explicit optional fields; it carries no editing or source inputs.
   *
   * @param stream exact permitted public URL/version, or null
   * @param sets known played sets, or null
   * @param venue permitted venue label, or null
   * @param referees permitted names; null unknown, empty known empty
   * @return public detail without private owner fields
   */
  private MatchDetail detail(StreamLink stream, Sets sets, String venue, List<String> referees) {
    return new MatchDetail(
        summary(CalendarCategoryEnum.UPCOMING, null),
        sets,
        venue,
        null,
        referees,
        stream,
        null,
        List.of());
  }

  /** Empty test-only MVC slice; no public endpoint is provided by this foundation. */
  @RestController
  static class Probe {}
}
