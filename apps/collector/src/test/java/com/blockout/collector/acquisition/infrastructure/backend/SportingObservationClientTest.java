package com.blockout.collector.acquisition.infrastructure.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.collector.acquisition.application.CollectionBackendFailure;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.generated.ingestion.api.SportingApi;
import com.blockout.collector.generated.ingestion.model.GeocodingOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.ResultStateEnum;
import com.blockout.collector.generated.ingestion.model.StandingsPublicationStateEnum;
import com.blockout.collector.ingestion.IngestionTestClient;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.openapitools.jackson.nullable.JsonNullable;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Exercises generated serialization and response decoding against a controlled HTTP peer. */
@DisplayName("Interpreted sporting observations through the actual generated HTTP client")
class SportingObservationClientTest {
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000153");
  private static final SportingObservation.Context CONTEXT =
      new SportingObservation.Context(
          ID, 7, Instant.parse("2026-10-19T12:00:00Z"), Instant.parse("2026-10-19T11:00:00Z"));
  private final JsonMapper json = JsonMapper.builder().build();
  private final AtomicInteger requests = new AtomicInteger();
  private HttpServer server;
  private IngestionTestClient transport;
  private SportingObservationClient client;
  private volatile byte[] received;
  private volatile URI receivedUri;
  private volatile int status = 200;
  private volatile String response = "{\"sourceReference\":\"M1\",\"outcome\":\"accepted\"}";

  /**
   * Starts a controlled backend peer and the real configured generated client.
   *
   * @throws IOException if the listener cannot be opened
   */
  @BeforeEach
  void start() throws IOException {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/ingestion",
        exchange -> {
          requests.incrementAndGet();
          receivedUri = exchange.getRequestURI();
          received = exchange.getRequestBody().readAllBytes();
          byte[] body = response.getBytes(StandardCharsets.UTF_8);
          exchange
              .getResponseHeaders()
              .add("Content-Type", status == 200 ? "application/json" : "application/problem+json");
          exchange.getResponseHeaders().add("Cache-Control", "no-store");
          exchange.sendResponseHeaders(status, body.length);
          exchange.getResponseBody().write(body);
          exchange.close();
        });
    server.start();
    transport = IngestionTestClient.connect("http://127.0.0.1:" + server.getAddress().getPort());
    client =
        new SportingObservationClient(
            new SportingApi(transport.api()), new SportingObservationMapperImpl());
  }

  /**
   * Releases the owned listener and HTTP pool.
   *
   * @throws Exception if the native transport cannot be closed
   */
  @AfterEach
  void close() throws Exception {
    server.stop(0);
    transport.close();
  }

  @Test
  @DisplayName("Carries catalog compound context and published URL provenance unchanged")
  void sendsCatalogContext() {
    // Given
    response =
        "{\"outcomes\":[{\"sourceReference\":\"CMA\",\"outcome\":\"unchanged\"}],\"absenceReconciled\":false}";
    SportingObservation.Pool pool =
        new SportingObservation.Pool(
            "QCM",
            "QCM",
            "CMA",
            "01",
            "CMA",
            URI.create("https://www.ffvbbeach.org/calendar"),
            null,
            "Synthetic group");

    // When
    SportingObservation.CatalogOutcome outcome =
        client.catalog(ID, CONTEXT, new SportingObservation.Catalog(true, List.of(pool)));

    // Then
    JsonNode body = json.readTree(received);
    assertThat(body.at("/pools/0/tourReference").asText()).isEqualTo("01");
    assertThat(body.at("/pools/0/calendarUrl").asText())
        .isEqualTo("https://www.ffvbbeach.org/calendar");
    assertThat(body.at("/pools/0").has("standingsUrl")).isFalse();
    assertThat(outcome.outcomes().getFirst().outcome()).isEqualTo(ObservationOutcomeEnum.UNCHANGED);
    assertThat(receivedUri.getPath()).endsWith("/source-bindings/" + ID + "/catalog-observations");
  }

  @Test
  @DisplayName("Preserves partial calendar acceptance instead of treating HTTP 200 as full success")
  void preservesPartialCalendarOutcome() {
    // Given
    List<SportingObservation.Match> matches =
        IntStream.rangeClosed(1, 100)
            .mapToObj(
                index ->
                    new SportingObservation.Match(
                        "M" + index,
                        new SportingObservation.Team("Home " + index, null, "000001", null),
                        new SportingObservation.Team("Away " + index, null, "000002", null),
                        SportingObservation.Facts.builder().build(),
                        null))
            .toList();
    response =
        json.writeValueAsString(
            Map.of(
                "outcomes",
                IntStream.rangeClosed(1, 100)
                    .mapToObj(
                        index ->
                            Map.of(
                                "sourceReference",
                                "M" + index,
                                "outcome",
                                index == 100 ? "rejected" : "accepted",
                                "created",
                                index != 100))
                    .toList(),
                "acceptedCount",
                99,
                "unchangedCount",
                0,
                "staleCount",
                0,
                "rejectedCount",
                1,
                "absenceReconciled",
                false));

    // When
    SportingObservation.CalendarOutcome outcome =
        client.calendar(
            ID, CONTEXT, new SportingObservation.Calendar(true, matches, List.of(), List.of()));

    // Then
    assertThat(outcome.acceptedCount()).isEqualTo(99);
    assertThat(outcome.rejectedCount()).isEqualTo(1);
    assertThat(outcome.absenceReconciled()).isFalse();
    assertThat(outcome.outcomes()).hasSize(100);
    assertThat(outcome.outcomes().getFirst().created()).isTrue();
    assertThat(json.readTree(received).get("matches").size()).isEqualTo(100);
  }

  @Test
  @DisplayName("Keeps empty current calendars explicit")
  void sendsQualifiedEmptyCalendar() {
    // Given
    response =
        "{\"outcomes\":[],\"acceptedCount\":0,\"unchangedCount\":0,\"staleCount\":0,\"rejectedCount\":0,\"absenceReconciled\":true}";

    // When
    SportingObservation.CalendarOutcome outcome =
        client.calendar(
            ID, CONTEXT, new SportingObservation.Calendar(true, List.of(), List.of(), List.of()));

    // Then
    assertThat(json.readTree(received).get("matches").isEmpty()).isTrue();
    assertThat(outcome.absenceReconciled()).isTrue();
  }

  @Test
  @DisplayName("Preserves a stale outcome instead of converting it into sporting success")
  void preservesStaleOutcome() {
    // Given
    response = "{\"sourceReference\":\"M1\",\"outcome\":\"stale\"}";

    // When
    SportingObservation.Outcome outcome =
        client.detail(ID, CONTEXT, SportingObservation.Facts.builder().build());

    // Then
    assertThat(outcome.outcome()).isEqualTo(ObservationOutcomeEnum.STALE);
    assertThat(requests).hasValue(1);
  }

  @Test
  @DisplayName("Maps omitted and explicit-null detail values without flattening presence")
  void preservesNullableDetailProposals() {
    // Given
    SportingObservation.Facts facts =
        SportingObservation.Facts.builder()
            .localTime(JsonNullable.of(null))
            .result(JsonNullable.of(null))
            .sets(JsonNullable.of(List.of()))
            .build();

    // When
    client.detail(ID, CONTEXT, facts);

    // Then
    JsonNode body = json.readTree(received);
    assertThat(body.at("/facts").has("localDate")).isFalse();
    assertThat(body.at("/facts/localTime").isNull()).isTrue();
    assertThat(body.at("/facts/result").isNull()).isTrue();
    assertThat(body.at("/facts/sets").isEmpty()).isTrue();
    assertThat(body.at("/context/readOrdinal").asLong()).isEqualTo(7);
    assertThat(body.at("/context/observedAt").asText()).isEqualTo("2026-10-19T12:00:00Z");
    assertThat(body.at("/context/providerPublishedAt").asText()).isEqualTo("2026-10-19T11:00:00Z");
  }

  @ParameterizedTest(name = "{0}")
  @MethodSource("nestedPresenceProposals")
  @DisplayName("Preserves presence while mapping nested result, sets and document proposals")
  void preservesNestedPresence(String scenario, SportingObservation.Facts facts, String expected) {
    // Given
    JsonNode expectedFacts = json.readTree(expected);

    // When
    client.detail(ID, CONTEXT, facts);

    // Then
    assertThat(json.readTree(received).get("facts")).isEqualTo(expectedFacts);
  }

  /**
   * Supplies explicit presence states at the handwritten mapper and real generated HTTP boundary.
   *
   * @return undefined, withdrawn and supplied nested proposals with their expected JSON
   */
  private static Stream<Arguments> nestedPresenceProposals() {
    return Stream.of(
        Arguments.of(
            "undefined",
            SportingObservation.Facts.builder()
                .result(JsonNullable.undefined())
                .sets(JsonNullable.undefined())
                .informationSheet(JsonNullable.undefined())
                .build(),
            "{}"),
        Arguments.of(
            "withdrawn",
            SportingObservation.Facts.builder()
                .result(JsonNullable.of(null))
                .sets(JsonNullable.of(null))
                .informationSheet(JsonNullable.of(null))
                .build(),
            "{\"result\":null,\"sets\":null,\"informationSheet\":null}"),
        Arguments.of(
            "supplied",
            SportingObservation.Facts.builder()
                .result(
                    JsonNullable.of(
                        new SportingObservation.Result(
                            ResultStateEnum.UNCONFIRMED, null, null, "F/F")))
                .sets(JsonNullable.of(List.of(new SportingObservation.SetScore(25, 20))))
                .informationSheet(
                    JsonNullable.of(
                        new SportingObservation.InformationSheet("2026/2027", "ABCD", "001")))
                .build(),
            """
            {"result":{"state":"unconfirmed","specialLabel":"F/F"},
             "sets":[{"home":25,"away":20}],
             "informationSheet":{"seasonLabel":"2026/2027","organizerReference":"ABCD","matchCode":"001"}}
            """));
  }

  @ParameterizedTest
  @EnumSource(StandingsPublicationStateEnum.class)
  @DisplayName("Distinguishes positively unpublished standings from a published empty table")
  void preservesStandingsPublication(StandingsPublicationStateEnum state) {
    // Given
    SportingObservation.Standings observation =
        new SportingObservation.Standings(state, List.of(), List.of());

    // When
    client.standings(ID, CONTEXT, observation);

    // Then
    assertThat(json.readTree(received).get("publicationState").asText())
        .isEqualTo(state.getValue());
    assertThat(receivedUri.getPath()).endsWith("/pools/" + ID + "/standings-observations");
  }

  @Test
  @DisplayName("Refuses a contradictory non-publication proposal before any HTTP write")
  void rejectsContradictoryStandings() {
    // When / Then
    assertThatThrownBy(
            () ->
                new SportingObservation.Standings(
                    StandingsPublicationStateEnum.NOT_PUBLISHED, List.of("Points"), List.of()))
        .isInstanceOf(IllegalArgumentException.class);
    assertThat(requests).hasValue(0);
  }

  @Test
  @DisplayName("Retains club omission and explicit withdrawal independently")
  void sendsClubProposals() {
    // Given
    SportingObservation.Club club =
        SportingObservation.Club.builder()
            .sourceName("Synthetic club")
            .postalCode(JsonNullable.of("00123"))
            .website(JsonNullable.of(null))
            .build();

    // When
    client.club(ID, CONTEXT, club);

    // Then
    JsonNode body = json.readTree(received);
    assertThat(body.get("postalCode").asText()).isEqualTo("00123");
    assertThat(body.get("website").isNull()).isTrue();
    assertThat(body.has("email")).isFalse();
    assertThat(receivedUri.getPath()).endsWith("/clubs/" + ID + "/detail-observations");
  }

  @Test
  @DisplayName("Preserves empty locality evidence without inventing coordinates")
  void sendsLocalityEvidence() {
    // When
    client.locality(
        ID,
        CONTEXT,
        new SportingObservation.Locality("revision-1", GeocodingOutcomeEnum.EMPTY, null, null));

    // Then
    JsonNode body = json.readTree(received);
    assertThat(body.get("localityRevision").asText()).isEqualTo("revision-1");
    assertThat(body.has("latitude")).isFalse();
    assertThat(body.has("longitude")).isFalse();
    assertThat(receivedUri.getPath()).endsWith("/clubs/" + ID + "/locality-observations");
  }

  @Test
  @DisplayName("Sends original image bytes with separate publication and observation timestamps")
  void sendsImageEvidence() {
    // Given
    byte[] image =
        Base64.getDecoder()
            .decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1kAAAAASUVORK5CYII=");

    // When
    client.logo(ID, CONTEXT, image);

    // Then
    assertThat(received).isEqualTo(image);
    assertThat(receivedUri.getQuery())
        .contains(
            "providerPublishedAt=2026-10-19T11:00:00Z",
            "observedAt=2026-10-19T12:00:00Z",
            "readOrdinal=7");
  }

  @ParameterizedTest
  @ValueSource(ints = {409, 503})
  @DisplayName("Preserves refusal or uncertainty after exactly one sporting write")
  void neverReplaysSportingWrite(int code) {
    // Given
    status = code;
    response =
        "{\"type\":\"urn:blockout:problem:conflict\",\"title\":\"Refused\",\"status\":"
            + code
            + "}";

    // When / Then
    assertThatThrownBy(
            () -> client.detail(ID, CONTEXT, SportingObservation.Facts.builder().build()))
        .isInstanceOf(CollectionBackendFailure.class);
    assertThat(requests).hasValue(1);
  }
}
