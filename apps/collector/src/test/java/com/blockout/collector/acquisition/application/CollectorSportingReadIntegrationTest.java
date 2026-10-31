package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.collector.acquisition.ffvb.FfvbCalendarParser;
import com.blockout.collector.acquisition.ffvb.FfvbPage;
import com.blockout.collector.acquisition.ffvb.FfvbScope;
import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendClient;
import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendMapperImpl;
import com.blockout.collector.acquisition.infrastructure.backend.SportingObservationClient;
import com.blockout.collector.acquisition.infrastructure.backend.SportingObservationMapperImpl;
import com.blockout.collector.generated.ingestion.api.CollectionApi;
import com.blockout.collector.generated.ingestion.api.CollectorOperationsApi;
import com.blockout.collector.generated.ingestion.api.SportingApi;
import com.blockout.collector.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.collector.generated.ingestion.model.CollectionStageEnum;
import com.blockout.collector.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.ResultStateEnum;
import com.blockout.collector.generated.ingestion.model.StandingsPublicationStateEnum;
import com.blockout.collector.ingestion.IngestionTestClient;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;

/**
 * F02 T034 synthetic facts through production collector mappers/generated clients, the executable
 * backend's generated interfaces and actual F03 HTTP reads. Only interpreted provider input and
 * local signing keys are controlled. PDF delivery, native consumers and provider coverage remain
 * with their owners; no generated response DTO is constructed as a substitute for a read.
 */
@EnabledIfSystemProperty(named = "blockout.qualify-collector-sporting", matches = "true")
@DisplayName("Generated sporting facts through actual public read consumers")
class CollectorSportingReadIntegrationTest {
  private static final UUID POOL = UUID.fromString("00000000-0000-4000-8000-000000000195");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000197");
  private static final Instant FIRST = Instant.parse("2026-10-24T12:00:00Z");
  private static final Instant PUBLISHED = Instant.parse("2026-10-23T12:00:00Z");
  private static final LocalDate DATE = LocalDate.of(2026, 10, 24);
  private static CollectorSportingRuntime runtime;
  private IngestionTestClient transport;
  private CollectionBackend backend;
  private SportingBackend sporting;
  private CollectorLifecycle lifecycle;
  private HttpClient publicHttp;
  private RestClient publicReads;

  /**
   * Starts the supplied repackaged backend on the explicitly selected disposable migrated database.
   *
   * @throws Exception if the selected runtime cannot start
   */
  @BeforeAll
  static void startBackend() throws Exception {
    runtime = new CollectorSportingRuntime();
  }

  /**
   * Stops only the backend and signing listener owned by this suite.
   *
   * @throws Exception if owned shutdown is interrupted
   */
  @AfterAll
  static void stopBackend() throws Exception {
    if (runtime != null) runtime.close();
  }

  /**
   * Resets the opt-in disposable fixture and composes actual generated collector HTTP consumers.
   * Public reads are anonymous and exercise F03's production generated-interface implementation.
   *
   * @throws Exception if fixture reset or client initialization fails
   */
  @BeforeEach
  void connect() throws Exception {
    try (Connection connection =
        DriverManager.getConnection(
            System.getProperty("qualification.database-url"),
            System.getProperty("qualification.migration-user"),
            System.getProperty("qualification.migration-password"))) {
      ScriptUtils.executeSqlScript(connection, new ClassPathResource("collector-sporting.sql"));
    }
    runtime.sql.update("UPDATE sporting_pool SET standings_url=calendar_url WHERE id=?", POOL);
    transport = runtime.connect((request, body, execution) -> execution.execute(request, body));
    backend =
        new CollectionBackendClient(
            new CollectorOperationsApi(transport.api()),
            new CollectionApi(transport.api()),
            new CollectionBackendMapperImpl());
    sporting =
        new SportingObservationClient(
            new SportingApi(transport.api()), new SportingObservationMapperImpl());
    lifecycle = new CollectorLifecycle(backend);
    lifecycle.start();
    publicHttp = HttpClient.newHttpClient();
    publicReads =
        RestClient.builder()
            .baseUrl(runtime.baseUrl())
            .requestFactory(new JdkClientHttpRequestFactory(publicHttp))
            .build();
  }

  /**
   * Closes both owned HTTP pools even when a scenario fails.
   *
   * @throws Exception if the generated transport cannot close
   */
  @AfterEach
  void closeClients() throws Exception {
    try {
      if (transport != null) transport.close();
    } finally {
      if (publicHttp != null) publicHttp.close();
    }
  }

  @ParameterizedTest
  @EnumSource(ResultStateEnum.class)
  @DisplayName("Numeric finality survives generated boundaries and controls professional documents")
  void preservesResultFinality(ResultStateEnum state) {
    // Given
    professionalScope();
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    SportingObservation.Facts facts =
        documents()
            .result(JsonNullable.of(new SportingObservation.Result(state, 1, 0, null)))
            .build();

    // When
    UUID id =
        sporting
            .calendar(POOL, context(cycle, cycle.nextReadOrdinal(), FIRST, null), calendar(facts))
            .outcomes()
            .getFirst()
            .resourceId();
    JsonNode read = read("/matches/" + id);

    // Then
    assertThat(read.at("/match/result/state").asString()).isEqualTo(state.getValue());
    assertThat(read.at("/match/result/homeSets").asInt()).isEqualTo(1);
    assertThat(read.at("/match/result/awaySets").isIntegralNumber()).isTrue();
    assertThat(read.at("/match/result/awaySets").asInt()).isZero();
    assertThat(read.at("/match/result").has("specialLabel")).isFalse();
    assertThat(read.at("/match/result/observedAt").asString()).isEqualTo(FIRST.toString());
    assertThat(read.at("/match/category").asString()).isEqualTo("completed");
    assertThat(
            read.get("documents")
                .valueStream()
                .map(document -> document.get("kind").asString())
                .toList())
        .containsExactlyElementsOf(
            state == ResultStateEnum.FINAL
                ? List.of("information", "scoresheet", "statistics")
                : List.of("information"));
    for (JsonNode document : read.get("documents")) {
      assertThat(document.get("url").asString())
          .isEqualTo("/matches/" + id + "/documents/" + document.get("kind").asString());
    }
    assertThat(read.toString())
        .doesNotContain("PRIVATE-CODE", "private-sheet", "private-statistics");
  }

  @ParameterizedTest
  @ValueSource(strings = {"F", "P", "3/F", "3/P", "F/F", "2/F"})
  @DisplayName("Synthetic recognized notations remain nonnumeric public results")
  void preservesSpecialNotation(String notation) {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    SportingObservation.Facts facts =
        SportingObservation.Facts.builder()
            .localDate(JsonNullable.of(DATE))
            .result(
                JsonNullable.of(
                    new SportingObservation.Result(ResultStateEnum.FINAL, null, null, notation)))
            .build();

    // When
    UUID id =
        sporting
            .calendar(POOL, context(cycle, cycle.nextReadOrdinal(), FIRST, null), calendar(facts))
            .outcomes()
            .getFirst()
            .resourceId();
    JsonNode read = read("/matches/" + id);

    // Then
    assertThat(read.at("/match/result/state").asString()).isEqualTo("final");
    assertThat(read.at("/match/result/specialLabel").asString()).isEqualTo(notation);
    assertThat(read.at("/match/result").has("homeSets")).isFalse();
    assertThat(read.at("/match/result").has("awaySets")).isFalse();
    assertThat(read.has("sets")).isFalse();
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "00:00"})
  @DisplayName(
      "An interpreted FFVB unknown time invents no result, instant or source publication time")
  void preservesUnknownFacts(String sourceTime) throws Exception {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    String html =
        new ClassPathResource("acquisition/ffvb/calendar.html")
            .getContentAsString(StandardCharsets.UTF_8)
            .replace("ABCCS", "SYNTHETIC")
            .replace("TST", "POOL");
    String csv =
        """
        Entité;Jo;Match;Date;Heure;EQA_no;EQA_nom;EQB_no;EQB_nom;Set;Score;Total;Salle;Arb1;Arb2;
        SYNTHETIC;01;POOL001;2026-10-24;%s;000192;Home;000193;Away;;;;;;;
        SYNTHETIC;02;POOL002;2026-10-25;00:00;000193;Away;;xxxxx;;;;;;;
        """
            .formatted(sourceTime);
    Charset charset = Charset.forName("windows-1252");
    FfvbScope scope = new FfvbScope("2026/2027", "SYNTHETIC", "COMP", "POOL", null, null);
    FfvbPage page =
        new FfvbPage(
            html.getBytes(charset),
            URI.create(
                "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?calend=COMPLET"),
            scope);
    long ordinal = cycle.nextReadOrdinal();

    // When
    SportingObservation.Calendar interpreted =
        new FfvbCalendarParser().parse(csv.getBytes(charset), page, scope);
    UUID id =
        sporting
            .calendar(POOL, context(cycle, ordinal, FIRST, null), interpreted)
            .outcomes()
            .getFirst()
            .resourceId();
    JsonNode read = read("/matches/" + id);

    // Then
    assertThat(interpreted.failures()).isEmpty();
    assertThat(read.at("/match/schedule/localDate").asString()).isEqualTo(DATE.toString());
    assertThat(read.at("/match/schedule").has("instant")).isFalse();
    assertThat(read.at("/match").has("result")).isFalse();
    assertThat(read.has("sets")).isFalse();
    assertThat(read.has("referees")).isFalse();
    assertThat(read.has("venueName")).isFalse();
    assertThat(read.get("documents").isEmpty()).isTrue();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT schedule_published_at FROM sporting_match WHERE id=?", Instant.class, id))
        .isNull();
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName(
      "Generated image metadata preserves supplied or unknown publication time through a public logo read")
  void preservesImageAttribution(boolean suppliedPublication) throws Exception {
    // Given
    professionalScope();
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    SportingObservation.CalendarOutcome calendar =
        sporting.calendar(
            POOL,
            context(cycle, cycle.nextReadOrdinal(), FIRST, null),
            calendar(SportingObservation.Facts.builder().localDate(JsonNullable.of(DATE)).build()));
    UUID team = calendar.outcomes().getFirst().homeTeamId();
    ByteArrayOutputStream png = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB), "png", png);
    Instant published = suppliedPublication ? PUBLISHED : null;

    // When
    SportingObservation.Outcome outcome =
        sporting.logo(
            team, context(cycle, cycle.nextReadOrdinal(), FIRST, published), png.toByteArray());
    byte[] served = publicReads.get().uri("/teams/" + team + "/logo").retrieve().body(byte[].class);

    // Then
    assertThat(outcome.outcome()).isEqualTo(ObservationOutcomeEnum.ACCEPTED);
    assertThat(served).containsExactly(png.toByteArray());
    assertThat(
            runtime.sql.queryForObject(
                "SELECT logo_published_at FROM sporting_team WHERE id=?", Instant.class, team))
        .isEqualTo(published);
  }

  @Test
  @DisplayName(
      "Retained compatible sets keep their freshness when a result has no publication time")
  void retainsIndependentFreshness() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    UUID id =
        sporting
            .calendar(
                POOL,
                context(cycle, cycle.nextReadOrdinal(), FIRST, PUBLISHED),
                calendar(
                    SportingObservation.Facts.builder()
                        .localDate(JsonNullable.of(DATE))
                        .result(
                            JsonNullable.of(
                                new SportingObservation.Result(ResultStateEnum.FINAL, 1, 0, null)))
                        .sets(JsonNullable.of(List.of(new SportingObservation.SetScore(25, 20))))
                        .build()))
            .outcomes()
            .getFirst()
            .resourceId();
    Instant later = FIRST.plusSeconds(60);

    // When
    SportingObservation.Outcome outcome =
        sporting.detail(
            id,
            context(cycle, cycle.nextReadOrdinal(), later, null),
            SportingObservation.Facts.builder()
                .result(
                    JsonNullable.of(
                        new SportingObservation.Result(ResultStateEnum.FINAL, 1, 0, null)))
                .build());
    JsonNode read = read("/matches/" + id);

    // Then
    assertThat(outcome.outcome()).isEqualTo(ObservationOutcomeEnum.UNCHANGED);
    assertThat(read.at("/match/result/observedAt").asString()).isEqualTo(later.toString());
    assertThat(read.at("/sets/observedAt").asString()).isEqualTo(FIRST.toString());
    assertThat(read.at("/sets/items/0/home").asInt()).isEqualTo(25);
    assertThat(read.at("/sets/items/0/away").asInt()).isEqualTo(20);
    assertThat(read.at("/match/schedule/observedAt").asString()).isEqualTo(FIRST.toString());
    assertThat(
            runtime.sql.queryForObject(
                "SELECT result_published_at FROM sporting_match WHERE id=?", Instant.class, id))
        .isNull();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT sets_published_at FROM sporting_match WHERE id=?", Instant.class, id))
        .isEqualTo(PUBLISHED);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT schedule_published_at FROM sporting_match WHERE id=?", Instant.class, id))
        .isEqualTo(PUBLISHED);
  }

  @Test
  @DisplayName(
      "A newer logical read can publish older supplier content without inferred precedence")
  void acceptsLaterReadOfOlderPublication() {
    // Given
    professionalScope();
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    UUID id =
        sporting
            .calendar(
                POOL,
                context(cycle, cycle.nextReadOrdinal(), FIRST, null),
                calendar(documents().build()))
            .outcomes()
            .getFirst()
            .resourceId();
    sporting.detail(
        id,
        context(cycle, cycle.nextReadOrdinal(), FIRST.plusSeconds(30), PUBLISHED),
        SportingObservation.Facts.builder()
            .result(
                JsonNullable.of(new SportingObservation.Result(ResultStateEnum.FINAL, 3, 1, null)))
            .build());
    Instant olderPublication = PUBLISHED.minusSeconds(3600);

    // When
    SportingObservation.Outcome outcome =
        sporting.detail(
            id,
            context(cycle, cycle.nextReadOrdinal(), FIRST.plusSeconds(60), olderPublication),
            SportingObservation.Facts.builder()
                .result(
                    JsonNullable.of(
                        new SportingObservation.Result(ResultStateEnum.PROVISIONAL, 1, 0, null)))
                .build());
    JsonNode read = read("/matches/" + id);

    // Then
    assertThat(outcome.outcome()).isEqualTo(ObservationOutcomeEnum.ACCEPTED);
    assertThat(read.at("/match/result/state").asString()).isEqualTo("provisional");
    assertThat(read.at("/match/result/homeSets").asInt()).isEqualTo(1);
    assertThat(
            read.get("documents")
                .valueStream()
                .map(document -> document.get("kind").asString())
                .toList())
        .containsExactly("information");
    assertThat(
            runtime.sql.queryForObject(
                "SELECT result_published_at FROM sporting_match WHERE id=?", Instant.class, id))
        .isEqualTo(olderPublication);
  }

  @Test
  @DisplayName(
      "A stale whole detail cannot withdraw a result or fill missing public document facts")
  void rejectsStaleWholeDetail() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    long older = cycle.nextReadOrdinal();
    UUID id =
        sporting
            .calendar(
                POOL,
                context(cycle, cycle.nextReadOrdinal(), FIRST, null),
                calendar(
                    SportingObservation.Facts.builder()
                        .localDate(JsonNullable.of(DATE))
                        .result(
                            JsonNullable.of(
                                new SportingObservation.Result(ResultStateEnum.FINAL, 3, 1, null)))
                        .build()))
            .outcomes()
            .getFirst()
            .resourceId();

    // When
    SportingObservation.Outcome stale =
        sporting.detail(
            id,
            context(cycle, older, FIRST.plusSeconds(60), PUBLISHED),
            documents()
                .result(JsonNullable.of(null))
                .venueName(JsonNullable.of("Late venue"))
                .build());
    JsonNode read = read("/matches/" + id);

    // Then
    assertThat(stale.outcome()).isEqualTo(ObservationOutcomeEnum.STALE);
    assertThat(read.at("/match/result/homeSets").asInt()).isEqualTo(3);
    assertThat(read.at("/match/result/awaySets").asInt()).isEqualTo(1);
    assertThat(read.has("venueName")).isFalse();
    assertThat(read.get("documents").isEmpty()).isTrue();
  }

  @Test
  @DisplayName(
      "An unusable set detail leaves the official overall score and independent venue usable")
  void isolatesContradictorySets() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);

    // When
    UUID id =
        sporting
            .calendar(
                POOL,
                context(cycle, cycle.nextReadOrdinal(), FIRST, null),
                calendar(
                    SportingObservation.Facts.builder()
                        .localDate(JsonNullable.of(DATE))
                        .result(
                            JsonNullable.of(
                                new SportingObservation.Result(ResultStateEnum.FINAL, 3, 1, null)))
                        .sets(JsonNullable.of(List.of(new SportingObservation.SetScore(25, 20))))
                        .venueName(JsonNullable.of("Synthetic gym"))
                        .build()))
            .outcomes()
            .getFirst()
            .resourceId();
    JsonNode read = read("/matches/" + id);

    // Then
    assertThat(read.at("/match/result/homeSets").asInt()).isEqualTo(3);
    assertThat(read.at("/match/result/awaySets").asInt()).isEqualTo(1);
    assertThat(read.has("sets")).isFalse();
    assertThat(read.get("venueName").asString()).isEqualTo("Synthetic gym");
  }

  @Test
  @DisplayName(
      "Result withdrawal removes set detail and gates retained document references until restoration")
  void reappliesDocumentEligibility() {
    // Given
    professionalScope();
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    UUID id =
        sporting
            .calendar(
                POOL,
                context(cycle, cycle.nextReadOrdinal(), FIRST, null),
                calendar(
                    documents()
                        .result(
                            JsonNullable.of(
                                new SportingObservation.Result(ResultStateEnum.FINAL, 1, 0, null)))
                        .sets(JsonNullable.of(List.of(new SportingObservation.SetScore(25, 20))))
                        .build()))
            .outcomes()
            .getFirst()
            .resourceId();

    // When
    sporting.detail(
        id,
        context(cycle, cycle.nextReadOrdinal(), FIRST.plusSeconds(60), null),
        SportingObservation.Facts.builder().result(JsonNullable.of(null)).build());
    JsonNode withdrawn = read("/matches/" + id);

    // Then
    assertThat(withdrawn.at("/match").has("result")).isFalse();
    assertThat(withdrawn.has("sets")).isFalse();
    assertThat(
            withdrawn
                .get("documents")
                .valueStream()
                .map(document -> document.get("kind").asString())
                .toList())
        .containsExactly("information");
    for (String kind : List.of("scoresheet", "statistics")) {
      assertThatThrownBy(() -> read("/matches/" + id + "/documents/" + kind))
          .isInstanceOfSatisfying(
              HttpClientErrorException.class,
              failure -> assertThat(failure.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    // When
    sporting.detail(
        id,
        context(cycle, cycle.nextReadOrdinal(), FIRST.plusSeconds(120), null),
        SportingObservation.Facts.builder()
            .result(
                JsonNullable.of(new SportingObservation.Result(ResultStateEnum.FINAL, 1, 0, null)))
            .build());
    JsonNode restored = read("/matches/" + id);

    // Then
    assertThat(restored.at("/match/id").asString()).isEqualTo(id.toString());
    assertThat(
            restored
                .get("documents")
                .valueStream()
                .map(document -> document.get("kind").asString())
                .toList())
        .containsExactly("information", "scoresheet", "statistics");
    assertThat(restored.has("sets")).isFalse();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT documents_observed_at FROM sporting_match WHERE id=?", Instant.class, id))
        .isEqualTo(FIRST);
  }

  @Test
  @DisplayName(
      "Rescheduling retains the qualified information code and private document attribution")
  void preservesDocumentAssociation() {
    // Given
    professionalScope();
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    UUID id =
        sporting
            .calendar(
                POOL,
                context(cycle, cycle.nextReadOrdinal(), FIRST, null),
                calendar(documents().build()))
            .outcomes()
            .getFirst()
            .resourceId();

    // When
    sporting.calendar(
        POOL,
        context(cycle, cycle.nextReadOrdinal(), FIRST.plusSeconds(60), null),
        calendar(
            SportingObservation.Facts.builder()
                .localDate(JsonNullable.of(DATE.plusDays(7)))
                .build()));
    JsonNode read = read("/matches/" + id);

    // Then
    assertThat(read.at("/match/id").asString()).isEqualTo(id.toString());
    assertThat(read.at("/match/schedule/localDate").asString())
        .isEqualTo(DATE.plusDays(7).toString());
    assertThat(
            read.get("documents")
                .valueStream()
                .map(document -> document.get("kind").asString())
                .toList())
        .containsExactly("information");
    assertThat(
            runtime.sql.queryForObject(
                "SELECT document_match_code FROM sporting_match WHERE id=?", String.class, id))
        .isEqualTo("PRIVATE-CODE");
    assertThat(
            runtime.sql.queryForObject(
                "SELECT documents_observed_at FROM sporting_match WHERE id=?", Instant.class, id))
        .isEqualTo(FIRST);
    assertThat(read.toString())
        .doesNotContain("PRIVATE-CODE", "private-sheet", "private-statistics");
  }

  @Test
  @DisplayName(
      "Official rows keep order, unknown rank, missing statistics and independent participant links")
  void preservesOfficialRows() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    sporting
        .calendar(
            POOL,
            context(cycle, cycle.nextReadOrdinal(), FIRST, null),
            calendar(SportingObservation.Facts.builder().localDate(JsonNullable.of(DATE)).build()))
        .outcomes()
        .getFirst()
        .resourceId();
    SportingObservation.Standings table =
        new SportingObservation.Standings(
            StandingsPublicationStateEnum.PUBLISHED,
            List.of("Points", "Ratio"),
            List.of(
                new SportingObservation.Standing("Unknown second", null, 2, Map.of("Ratio", "MAX")),
                new SportingObservation.Standing("Home", null, 1, Map.of("Points", "9")),
                new SportingObservation.Standing("Unranked", null, null, Map.of())));

    // When
    sporting.standings(POOL, context(cycle, cycle.nextReadOrdinal(), FIRST, PUBLISHED), table);
    JsonNode read = read("/pools/" + POOL + "/standings");
    JsonNode participants = read("/pools/" + POOL + "/participants");

    // Then
    assertThat(read.get("availability").asString()).isEqualTo("available");
    assertThat(read.get("columns").valueStream().map(JsonNode::asString).toList())
        .containsExactly("Points", "Ratio");
    assertThat(read.get("rows").valueStream().map(row -> row.get("sourceName").asString()).toList())
        .containsExactly("Unknown second", "Home", "Unranked");
    assertThat(read.at("/rows/0/position").asInt()).isEqualTo(2);
    assertThat(read.at("/rows/1/position").asInt()).isEqualTo(1);
    assertThat(read.at("/rows/2").has("position")).isFalse();
    assertThat(read.at("/rows/0/statistics/Ratio").asString()).isEqualTo("MAX");
    assertThat(read.at("/rows/0/statistics").has("Points")).isFalse();
    assertThat(read.at("/rows/2/statistics").isEmpty()).isTrue();
    assertThat(read.at("/rows/0").has("team")).isFalse();
    assertThat(read.at("/rows/2").has("team")).isFalse();
    assertThat(read.at("/rows/1/team/name").asString()).isEqualTo("Home");
    assertThat(participants.get("items").size()).isEqualTo(2);
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_team", Integer.class))
        .isEqualTo(2);
  }

  @Test
  @DisplayName("An official row loses only its team link after calendar participation is withdrawn")
  void unlinksWithdrawnParticipant() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    sporting
        .calendar(
            POOL,
            context(cycle, cycle.nextReadOrdinal(), FIRST, null),
            calendar(SportingObservation.Facts.builder().localDate(JsonNullable.of(DATE)).build()))
        .outcomes()
        .getFirst()
        .resourceId();
    sporting.standings(
        POOL,
        context(cycle, cycle.nextReadOrdinal(), FIRST, null),
        new SportingObservation.Standings(
            StandingsPublicationStateEnum.PUBLISHED,
            List.of("Points"),
            List.of(new SportingObservation.Standing("Home", null, 7, Map.of("Points", "12")))));
    JsonNode linked = read("/pools/" + POOL + "/standings");
    assertThat(linked.at("/rows/0").has("team")).isTrue();

    // When
    sporting.calendar(
        POOL,
        context(cycle, cycle.nextReadOrdinal(), FIRST.plusSeconds(60), null),
        new SportingObservation.Calendar(
            true,
            List.of(
                new SportingObservation.Match(
                    "M2",
                    new SportingObservation.Team("Next home", "NEXT", "000194", "Next club"),
                    new SportingObservation.Team("Away", "AWAY", "000193", "Away club"),
                    SportingObservation.Facts.builder().localDate(JsonNullable.of(DATE)).build(),
                    null)),
            List.of(),
            List.of()));
    JsonNode unlinked = read("/pools/" + POOL + "/standings");

    // Then
    assertThat(unlinked.at("/rows/0").has("team")).isFalse();
    assertThat(unlinked.at("/rows/0/sourceName").asString()).isEqualTo("Home");
    assertThat(unlinked.at("/rows/0/position").asInt()).isEqualTo(7);
    assertThat(unlinked.at("/rows/0/statistics/Points").asString()).isEqualTo("12");
    assertThat(unlinked.get("observedAt")).isEqualTo(linked.get("observedAt"));
  }

  @Test
  @DisplayName("Qualified non-publication retains the usable table's original public freshness")
  void retainsTableAfterNonPublication() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    sporting.standings(
        POOL,
        context(cycle, cycle.nextReadOrdinal(), FIRST, PUBLISHED),
        new SportingObservation.Standings(
            StandingsPublicationStateEnum.PUBLISHED,
            List.of("Ratio"),
            List.of(
                new SportingObservation.Standing("Retained", null, null, Map.of("Ratio", "∞")))));

    // When
    sporting.standings(
        POOL,
        context(cycle, cycle.nextReadOrdinal(), FIRST.plusSeconds(60), null),
        new SportingObservation.Standings(
            StandingsPublicationStateEnum.NOT_PUBLISHED, List.of(), List.of()));
    JsonNode read = read("/pools/" + POOL + "/standings");

    // Then
    assertThat(read.get("availability").asString()).isEqualTo("available");
    assertThat(read.get("observedAt").asString()).isEqualTo(FIRST.toString());
    assertThat(read.at("/rows/0/sourceName").asString()).isEqualTo("Retained");
    assertThat(read.at("/rows/0/statistics/Ratio").asString()).isEqualTo("∞");
    assertThat(read.get("lastAttemptFailed").asBoolean()).isFalse();
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName(
      "A failed standings acquisition preserves the last usable table or stays unavailable")
  void preservesStandingsAfterFailure(boolean retainedTable) {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    if (retainedTable) {
      sporting.standings(
          POOL,
          context(cycle, cycle.nextReadOrdinal(), FIRST, null),
          new SportingObservation.Standings(
              StandingsPublicationStateEnum.PUBLISHED,
              List.of("Points"),
              List.of(
                  new SportingObservation.Standing("Retained", null, 4, Map.of("Points", "7")))));
    }

    // When
    backend.record(
        cycle.getCycle().id(),
        new CollectionBackend.Result(
            POOL,
            CollectionStageEnum.STANDINGS,
            CollectionPhaseEnum.ACQUISITION,
            cycle.nextReadOrdinal(),
            FIRST.plusSeconds(60),
            CollectionOutcomeEnum.FAILED,
            URI.create("https://blockout.app/problems/source-unavailable"),
            null,
            null,
            null));
    JsonNode read = read("/pools/" + POOL + "/standings");

    // Then
    assertThat(read.get("lastAttemptFailed").asBoolean()).isTrue();
    assertThat(read.get("availability").asString())
        .isEqualTo(retainedTable ? "available" : "unavailable");
    if (retainedTable) {
      assertThat(read.get("observedAt").asString()).isEqualTo(FIRST.toString());
      assertThat(read.at("/rows/0/sourceName").asString()).isEqualTo("Retained");
      assertThat(read.at("/rows/0/position").asInt()).isEqualTo(4);
      assertThat(read.at("/rows/0/statistics/Points").asString()).isEqualTo("7");
    } else {
      assertThat(read.has("observedAt")).isFalse();
      assertThat(read.get("rows").isEmpty()).isTrue();
    }
  }

  @Test
  @DisplayName("No table, qualified non-publication and a published empty table remain distinct")
  void distinguishesStandingsAvailability() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    JsonNode unavailable = read("/pools/" + POOL + "/standings");

    // When
    sporting.standings(
        POOL,
        context(cycle, cycle.nextReadOrdinal(), FIRST, null),
        new SportingObservation.Standings(
            StandingsPublicationStateEnum.NOT_PUBLISHED, List.of(), List.of()));
    JsonNode unpublished = read("/pools/" + POOL + "/standings");
    sporting.standings(
        POOL,
        context(cycle, cycle.nextReadOrdinal(), FIRST.plusSeconds(60), null),
        new SportingObservation.Standings(
            StandingsPublicationStateEnum.PUBLISHED, List.of(), List.of()));
    JsonNode empty = read("/pools/" + POOL + "/standings");

    // Then
    assertThat(unavailable.get("availability").asString()).isEqualTo("unavailable");
    assertThat(unavailable.has("observedAt")).isFalse();
    assertThat(unpublished.get("availability").asString()).isEqualTo("not-published");
    assertThat(unpublished.has("observedAt")).isFalse();
    assertThat(empty.get("availability").asString()).isEqualTo("available");
    assertThat(empty.get("observedAt").asString()).isEqualTo(FIRST.plusSeconds(60).toString());
    assertThat(empty.get("rows").isEmpty()).isTrue();
  }

  /**
   * Uses qualified LNV fixture identity before admission; no professional club mapping is invented.
   */
  private void professionalScope() {
    runtime.sql.update("UPDATE sporting_pack SET provider='LNV'");
    runtime.sql.update("UPDATE sporting_pool SET provider='LNV'");
    runtime.sql.update("UPDATE collection_source_binding SET provider='LNV'");
    runtime.sql.update("UPDATE collection_control SET family='LNV' WHERE id=?", CONTROL);
  }

  /**
   * Supplies synthetic qualified private locators; these tests never request eligible PDF bytes.
   *
   * @return date and distinct document proposals without a result
   */
  private SportingObservation.Facts.FactsBuilder documents() {
    return SportingObservation.Facts.builder()
        .localDate(JsonNullable.of(DATE))
        .informationSheet(
            JsonNullable.of(
                new SportingObservation.InformationSheet("2026/2027", "AALNV", "PRIVATE-CODE")))
        .scoresheetUrl(
            JsonNullable.of(URI.create("https://lnv-web.dataproject.com/private-sheet.pdf")))
        .statisticsUrl(
            JsonNullable.of(URI.create("https://lnv-web.dataproject.com/private-statistics.pdf")));
  }

  /**
   * Names the one-match calendar with exact participant identity for either fixture source.
   *
   * @param facts scenario-defining optional facts
   * @return complete synthetic observation without a fabricated provider response
   */
  private SportingObservation.Calendar calendar(SportingObservation.Facts facts) {
    return new SportingObservation.Calendar(
        true,
        List.of(
            new SportingObservation.Match(
                "M1",
                new SportingObservation.Team("Home", "HOME", "000192", "Home club"),
                new SportingObservation.Team("Away", "AWAY", "000193", "Away club"),
                facts,
                null)),
        List.of(),
        List.of());
  }

  /**
   * Carries source attribution without deriving publication time from observation time.
   *
   * @param cycle actual admitted scope and order owner
   * @param ordinal allocated before this interpreted read
   * @param observed actual synthetic observation instant
   * @param published supplied source publication instant, or null when unknown
   * @return application input mapped by the production generated-client adapter
   */
  private SportingObservation.Context context(
      CollectorLifecycle.AdmittedCycle cycle, long ordinal, Instant observed, Instant published) {
    return new SportingObservation.Context(cycle.getCycle().id(), ordinal, observed, published);
  }

  /**
   * Reads real F03 response bytes without a fabricated/generated response object.
   *
   * @param path backend-owned public resource
   * @return parsed HTTP representation
   * @throws HttpClientErrorException for current admission or resource refusals
   */
  private JsonNode read(String path) {
    String body = publicReads.get().uri(path).retrieve().body(String.class);
    return transport.api().getJsonMapper().readTree(body);
  }
}
