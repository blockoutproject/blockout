package com.blockout.collector.ingestion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.blockout.collector.generated.ingestion.ApiClient;
import com.blockout.collector.generated.ingestion.api.CollectionApi;
import com.blockout.collector.generated.ingestion.api.SportingApi;
import com.blockout.collector.generated.ingestion.model.GetCollectorRuntime200Response;
import com.blockout.collector.generated.ingestion.model.ObserveMatchDetailRequest;
import com.blockout.collector.generated.ingestion.model.ObservePoolCalendarRequestMatchesInnerFacts;
import com.blockout.collector.generated.ingestion.model.ObservePoolCalendarRequestMatchesInnerFactsSetsInner;
import com.blockout.collector.generated.ingestion.model.ObserveSportingCatalog200ResponseOutcomesInner;
import com.blockout.collector.generated.ingestion.model.ObserveSportingCatalogRequestContext;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.observation.ObservationRegistry;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Exercises the generated sporting client and canonical validator against a controlled HTTP peer.
 */
@DisplayName("Generated sporting ingestion contract")
class SportingContractTest {
  private final JsonMapper json = JsonMapper.builder().build();
  private HttpServer server;
  private HttpComponentsClientHttpRequestFactory factory;
  private SportingApi api;
  private volatile JsonNode received;
  private volatile String receivedPath;
  private volatile int status = 200;
  private volatile String responseBody =
      "{\"sourceReference\":\"M42\",\"outcome\":\"accepted\",\"future\":true}";
  private static final UUID MATCH = UUID.fromString("00000000-0000-4000-8000-000000000001");

  /**
   * Starts an isolated peer and the actual configured generated client, without provider access.
   *
   * @throws IOException if the listener or canonical contract cannot be opened
   */
  @BeforeEach
  void startServer() throws IOException {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/ingestion",
        exchange -> {
          receivedPath = exchange.getRequestURI().getPath();
          received = json.readTree(exchange.getRequestBody().readAllBytes());
          byte[] response = responseBody.getBytes(StandardCharsets.UTF_8);
          exchange
              .getResponseHeaders()
              .add("Content-Type", status == 200 ? "application/json" : "application/problem+json");
          exchange.getResponseHeaders().add("Cache-Control", "no-store");
          exchange.sendResponseHeaders(status, response.length);
          exchange.getResponseBody().write(response);
          exchange.close();
        });
    server.start();
    IngestionClientConfiguration configuration = new IngestionClientConfiguration();
    factory = configuration.ingestionRequestFactory(Duration.ofSeconds(2));
    ApiClient client =
        configuration.ingestionApiClient(
            factory,
            ObservationRegistry.NOOP,
            "http://127.0.0.1:" + server.getAddress().getPort(),
            new ClassPathResource("contracts/ingestion.yaml"));
    client.setBearerToken("harmless-test-token");
    api = new SportingApi(client);
  }

  /**
   * Releases the owned listener and connection pool after each scenario.
   *
   * @throws Exception if the HTTP pool cannot be closed
   */
  @AfterEach
  void stopServer() throws Exception {
    server.stop(0);
    factory.destroy();
  }

  @ParameterizedTest(name = "{0}")
  @MethodSource("dateProposals")
  @DisplayName("Preserves omitted, withdrawn and supplied dates on the wire")
  void serializesDatePresence(String scenario, JsonNullable<LocalDate> date, String expectedFacts) {
    // Given
    ObservePoolCalendarRequestMatchesInnerFacts facts =
        new ObservePoolCalendarRequestMatchesInnerFacts();
    facts.setLocalDate_JsonNullable(date);
    ObserveMatchDetailRequest request = request(facts);

    // When
    ObserveSportingCatalog200ResponseOutcomesInner result = api.observeMatchDetail(MATCH, request);

    // Then
    assertThat(receivedPath).isEqualTo("/ingestion/matches/" + MATCH + "/detail-observations");
    assertThat(received.get("facts")).isEqualTo(json.readTree(expectedFacts));
    assertThat(received.get("context").get("observedAt").asText())
        .isEqualTo("2026-10-18T18:00:00Z");
    assertThat(received.get("context").has("providerPublishedAt")).isFalse();
    assertThat(result.getSourceReference()).isEqualTo("M42");
    assertThat(result.getOutcome())
        .isEqualTo(ObserveSportingCatalog200ResponseOutcomesInner.OutcomeEnum.ACCEPTED);
  }

  @ParameterizedTest(name = "{0}")
  @MethodSource("setProposals")
  @DisplayName("Preserves omitted, withdrawn, empty and supplied sets on the wire")
  void serializesCollectionPresence(
      String scenario,
      JsonNullable<List<ObservePoolCalendarRequestMatchesInnerFactsSetsInner>> sets,
      String expectedFacts) {
    // Given
    ObservePoolCalendarRequestMatchesInnerFacts facts =
        new ObservePoolCalendarRequestMatchesInnerFacts();
    facts.setSets_JsonNullable(sets);
    ObserveMatchDetailRequest request = request(facts);

    // When
    api.observeMatchDetail(MATCH, request);

    // Then
    assertThat(received.get("facts")).isEqualTo(json.readTree(expectedFacts));
  }

  @Test
  @DisplayName("Serializes supplied publication time independently from observation time")
  void preservesPublicationTime() {
    // Given
    ObserveMatchDetailRequest request =
        request(new ObservePoolCalendarRequestMatchesInnerFacts().result(null).sets(List.of()));
    request.getContext().providerPublishedAt(OffsetDateTime.parse("2026-10-18T17:00:00Z"));

    // When
    api.observeMatchDetail(MATCH, request);

    // Then
    assertThat(received.get("context").get("providerPublishedAt").asText())
        .isEqualTo("2026-10-18T17:00:00Z");
    assertThat(received.get("facts").get("result").isNull()).isTrue();
    assertThat(received.get("facts").get("sets").isEmpty()).isTrue();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"sourceReference\":\"M42\",\"outcome\":\"future\"}",
        "{\"sourceReference\":\"M42\",\"outcome\":\"accepted\",\"resourceId\":\"invalid-uuid\"}"
      })
  @DisplayName("Rejects malformed known outcome fields despite additive response tolerance")
  void rejectsInvalidOutcome(String response) {
    // Given
    responseBody = response;
    ObserveMatchDetailRequest request = request(new ObservePoolCalendarRequestMatchesInnerFacts());

    // When
    Throwable failure = catchThrowable(() -> api.observeMatchDetail(MATCH, request));

    // Then
    assertThat(failure)
        .isInstanceOf(RestClientException.class)
        .hasMessage("Invalid ingestion HTTP exchange");
  }

  @Test
  @DisplayName("Exposes the canonical refusal instead of a successful sporting outcome")
  void preservesSafeRefusal() {
    // Given
    status = 503;
    responseBody =
        "{\"type\":\"urn:blockout:problem:unavailable\",\"title\":\"Service Unavailable\",\"status\":503}";
    ObserveMatchDetailRequest request = request(new ObservePoolCalendarRequestMatchesInnerFacts());

    // When
    Throwable failure = catchThrowable(() -> api.observeMatchDetail(MATCH, request));

    // Then
    assertThat(failure)
        .isInstanceOfSatisfying(
            RestClientResponseException.class,
            exception -> {
              assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
              assertThat(json.readTree(exception.getResponseBodyAsString()).get("type").asText())
                  .isEqualTo("urn:blockout:problem:unavailable");
            });
  }

  @Test
  @DisplayName("Retains required nulls under the shared model inclusion default")
  void retainsRequiredNull() {
    // Given
    GetCollectorRuntime200Response body =
        new GetCollectorRuntime200Response().revision(1L).incarnationId(null);
    responseBody = api.getApiClient().getJsonMapper().writeValueAsString(body);
    CollectionApi runtime = new CollectionApi(api.getApiClient());

    // When
    GetCollectorRuntime200Response result = runtime.getCollectorRuntime();

    // Then
    assertThat(json.readTree(responseBody).has("incarnationId")).isTrue();
    assertThat(result.getRevision()).isEqualTo(1L);
    assertThat(result.getIncarnationId()).isNull();
  }

  /**
   * Keeps the three wire meanings explicit without a custom proposal wrapper or random fixtures.
   *
   * @return native nullable values paired with their expected serialized facts
   */
  private static Stream<Arguments> dateProposals() {
    return Stream.of(
        Arguments.of("omitted", JsonNullable.undefined(), "{}"),
        Arguments.of("withdrawn", JsonNullable.of(null), "{\"localDate\":null}"),
        Arguments.of(
            "supplied",
            JsonNullable.of(LocalDate.of(2026, 10, 18)),
            "{\"localDate\":\"2026-10-18\"}"));
  }

  /**
   * Keeps whole-list absence distinct from an explicitly empty or populated collection.
   *
   * @return native collection proposals paired with their expected serialized facts
   */
  private static Stream<Arguments> setProposals() {
    return Stream.of(
        Arguments.of("omitted", JsonNullable.undefined(), "{}"),
        Arguments.of("withdrawn", JsonNullable.of(null), "{\"sets\":null}"),
        Arguments.of("empty", JsonNullable.of(List.of()), "{\"sets\":[]}"),
        Arguments.of(
            "supplied",
            JsonNullable.of(
                List.of(
                    new ObservePoolCalendarRequestMatchesInnerFactsSetsInner().home(25).away(20))),
            "{\"sets\":[{\"home\":25,\"away\":20}]}"));
  }

  /**
   * Supplies fixed required context without hiding the scenario's fact proposals.
   *
   * @param facts independent facts under test
   * @return generated request for the isolated sporting endpoint
   */
  private static ObserveMatchDetailRequest request(
      ObservePoolCalendarRequestMatchesInnerFacts facts) {
    return new ObserveMatchDetailRequest()
        .context(
            new ObserveSportingCatalogRequestContext()
                .cycleId(UUID.fromString("00000000-0000-4000-8000-000000000002"))
                .readOrdinal(7L)
                .observedAt(OffsetDateTime.parse("2026-10-18T18:00:00Z")))
        .facts(facts);
  }
}
