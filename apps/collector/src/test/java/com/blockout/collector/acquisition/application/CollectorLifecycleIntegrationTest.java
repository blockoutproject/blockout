package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.blockout.collector.acquisition.infrastructure.CollectorStartup;
import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendClient;
import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendMapperImpl;
import com.blockout.collector.generated.ingestion.ApiClient;
import com.blockout.collector.generated.ingestion.api.CollectionApi;
import com.blockout.collector.generated.ingestion.api.CollectorOperationsApi;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.LoggerFactory;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Exercises startup and read-only uncertainty recovery through a controlled generated HTTP peer.
 */
@DisplayName("Collector startup and uncertain admission through the generated client")
class CollectorLifecycleIntegrationTest {
  private HttpServer server;
  private HttpComponentsClientHttpRequestFactory requests;
  private final List<String> calls = new ArrayList<>();
  private UUID registered;
  private UUID admitted;
  private String cycle;
  private boolean loseAdmission;
  private boolean loseRegistration;
  private boolean refuseAdmission;
  private boolean contradictoryPurpose;
  private boolean omitCandidate;
  private boolean refuseCycleRead;
  private int unavailableCycleStatus = 503;
  private CollectorLifecycle lifecycle;
  private CollectionBackendClient backend;

  /** Starts a native local HTTP peer and a generated client with automatic retries disabled. */
  @BeforeEach
  void startPeer() throws Exception {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    JsonMapper json = JsonMapper.builder().build();
    server.createContext(
        "/ingestion",
        exchange -> {
          String method = exchange.getRequestMethod();
          String path = exchange.getRequestURI().getPath();
          calls.add(method + " " + path);
          int status = 200;
          String body;
          if (path.endsWith("collection-work")) {
            body =
                """
                {"controls":[{"id":"00000000-0000-4000-8000-000000000183","family":"ffvb",
                "seasonId":"00000000-0000-4000-8000-000000000184","revision":7,"enabled":true,
                "seasonState":"active","requestId":"00000000-0000-4000-8000-000000000185","requestedMode":"manual"}],
                "validations":[{"sourceBindingId":"00000000-0000-4000-8000-000000000186","revision":3,
                "candidateUrl":"https://www.ffvbbeach.org/source","seasonLabel":"2026/2027","provider":"ffvb","organizerReference":"ABCCS"}]}
                """;
          } else if (path.endsWith("collector-runtime")) {
            if (method.equals("PUT"))
              registered =
                  UUID.fromString(
                      json.readTree(exchange.getRequestBody()).get("incarnationId").asText());
            if (method.equals("PUT") && loseRegistration) {
              exchange.close();
              return;
            }
            body =
                "{\"revision\":1,\"incarnationId\":"
                    + (registered == null ? "null" : "\"" + registered + "\"")
                    + "}";
          } else if (method.equals("POST")) {
            JsonNode command = json.readTree(exchange.getRequestBody());
            admitted = UUID.fromString(command.get("cycleId").asText());
            String purpose;
            if (command.get("sourceBindingId") != null) {
              String source = command.get("sourceBindingId").asText();
              purpose =
                  "\"sourceBindingId\":\""
                      + source
                      + "\",\"candidate\":{"
                      + "\"sourceBindingId\":\""
                      + source
                      + "\",\"revision\":7,"
                      + "\"candidateUrl\":\"https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901\","
                      + "\"seasonLabel\":\"2026/2027\",\"provider\":\"lnv\",\"organizerReference\":\"901\"}";
              if (omitCandidate) purpose = "\"sourceBindingId\":\"" + source + "\"";
            } else {
              purpose =
                  "\"controlId\":\""
                      + command.get("controlId").asText()
                      + "\",\"mode\":\"periodic\"";
            }
            cycle =
                "{\"id\":\""
                    + admitted
                    + "\",\"incarnationId\":\""
                    + registered
                    + "\","
                    + purpose
                    + ",\"cycleOrder\":3,\"state\":\"running\",\"startedAt\":\"2026-10-19T10:00:00Z\"}";
            if (contradictoryPurpose)
              cycle =
                  cycle.replace(
                      "\"mode\":\"periodic\"",
                      "\"mode\":\"periodic\",\"sourceBindingId\":\"00000000-0000-4000-8000-000000000002\"");
            if (refuseAdmission) {
              byte[] problem =
                  "{\"type\":\"urn:blockout:problem:invalid-cycle-context\",\"title\":\"Conflict\",\"status\":409}"
                      .getBytes(StandardCharsets.UTF_8);
              exchange.getResponseHeaders().add("Content-Type", "application/problem+json");
              exchange.sendResponseHeaders(409, problem.length);
              exchange.getResponseBody().write(problem);
              exchange.close();
              return;
            }
            if (loseAdmission) {
              exchange.close();
              return;
            }
            body = cycle;
          } else {
            status = refuseCycleRead ? unavailableCycleStatus : 200;
            body = refuseCycleRead ? "{}" : cycle;
          }
          byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.sendResponseHeaders(status, bytes.length);
          exchange.getResponseBody().write(bytes);
          exchange.close();
        });
    server.start();
    requests =
        new HttpComponentsClientHttpRequestFactory(
            HttpClients.custom().disableAutomaticRetries().disableRedirectHandling().build());
    ApiClient api =
        new ApiClient(ApiClient.buildRestClientBuilder().requestFactory(requests).build());
    api.setBasePath("http://127.0.0.1:" + server.getAddress().getPort());
    backend =
        new CollectionBackendClient(
            new CollectorOperationsApi(api),
            new CollectionApi(api),
            new CollectionBackendMapperImpl());
    lifecycle = new CollectorLifecycle(backend);
  }

  /** Releases the listener and the HTTP pool owned by this scenario. */
  @AfterEach
  void closePeer() throws Exception {
    server.stop(0);
    requests.destroy();
  }

  @Test
  @DisplayName(
      "Current-work polling maps generated conditional intent without admitting or reading providers")
  void readsGeneratedWork() {
    // Given
    lifecycle.start();

    // When
    CollectionBackend.Work work = backend.work(lifecycle.getIncarnationId());

    // Then
    assertThat(work.controls())
        .singleElement()
        .satisfies(
            control -> {
              assertThat(control.revision()).isEqualTo(7);
              assertThat(control.requestedMode())
                  .isEqualTo(
                      com.blockout.collector.generated.ingestion.model.CollectionModeEnum.MANUAL);
              assertThat(control.requestId())
                  .isEqualTo(UUID.fromString("00000000-0000-4000-8000-000000000185"));
            });
    assertThat(work.validations())
        .singleElement()
        .satisfies(
            candidate -> {
              assertThat(candidate.revision()).isEqualTo(3);
              assertThat(candidate.sourceBindingId())
                  .isEqualTo(UUID.fromString("00000000-0000-4000-8000-000000000186"));
            });
    assertThat(calls)
        .containsExactly(
            "GET /ingestion/collector-runtime",
            "PUT /ingestion/collector-runtime",
            "GET /ingestion/collection-work");
  }

  @Test
  @DisplayName("Reads then registers the startup UUID once before accepting work")
  void registersOneStartup() throws Exception {

    // When
    AcquisitionScheduler scheduler = mock(AcquisitionScheduler.class);
    new CollectorStartup(lifecycle, scheduler).run(new DefaultApplicationArguments());
    verify(scheduler).start();

    // Then
    assertThat(calls)
        .containsExactly("GET /ingestion/collector-runtime", "PUT /ingestion/collector-runtime");
    assertThat(registered).isEqualTo(lifecycle.getIncarnationId());
    assertThatThrownBy(lifecycle::start).isInstanceOf(IllegalStateException.class);
    assertThat(calls).hasSize(2);
  }

  @Test
  @DisplayName(
      "Reads the same cycle after a lost admission response before exposing provider context")
  void confirmsUncertainAdmission() {
    // Given
    lifecycle.start();
    loseAdmission = true;
    UUID control = UUID.fromString("00000000-0000-4000-8000-000000000001");

    // When
    CollectorLifecycle.AdmittedCycle context = lifecycle.admit(control, null, 0, null);

    // Then
    assertThat(context.getCycle().id()).isEqualTo(admitted);
    assertThat(calls.subList(2, calls.size()))
        .containsExactly(
            "POST /ingestion/collection-cycles", "GET /ingestion/collection-cycles/" + admitted);
    assertThat(context.nextReadOrdinal()).isEqualTo(1);
    assertThat(context.nextReadOrdinal()).isEqualTo(2);
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName(
      "Confirmed admission retains the exact candidate from its original response or recovery read")
  void retainsConfirmedCandidate(boolean responseLost) {
    // Given
    lifecycle.start();
    loseAdmission = responseLost;
    UUID source = UUID.fromString("00000000-0000-4000-8000-000000000151");

    // When
    CollectorLifecycle.AdmittedCycle context = lifecycle.admit(null, source, 7, null);

    // Then
    assertThat(context.getCycle().sourceBindingId()).isEqualTo(source);
    assertThat(context.getCycle().mode()).isNull();
    assertThat(context.getCycle().candidate())
        .isEqualTo(
            new CollectionBackend.Candidate(
                URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901"),
                "2026/2027",
                com.blockout.collector.generated.ingestion.model.CollectionProviderEnum.LNV,
                "901"));
    List<String> expected =
        responseLost
            ? List.of(
                "POST /ingestion/collection-cycles", "GET /ingestion/collection-cycles/" + admitted)
            : List.of("POST /ingestion/collection-cycles");
    assertThat(calls.subList(2, calls.size())).containsExactlyElementsOf(expected);
    assertThat(context.nextReadOrdinal()).isEqualTo(1);
  }

  @ParameterizedTest
  @ValueSource(ints = {404, 503})
  @DisplayName(
      "An unresolved original admission remains uncertain and logs its original UUID for inspection")
  void refusesUnconfirmedAdmission(int readStatus) {
    // Given
    lifecycle.start();
    loseAdmission = true;
    refuseCycleRead = true;
    unavailableCycleStatus = readStatus;
    Logger logger = (Logger) LoggerFactory.getLogger(CollectorLifecycle.class);
    ListAppender<ILoggingEvent> events = new ListAppender<>();
    events.start();
    logger.addAppender(events);
    try {
      // When
      org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
          () ->
              lifecycle.admit(
                  UUID.fromString("00000000-0000-4000-8000-000000000151"), null, 0, null);

      // Then
      assertThatThrownBy(action)
          .isInstanceOfSatisfying(
              CollectionBackendFailure.class,
              failure ->
                  assertThat(failure.getKind())
                      .isEqualTo(CollectionBackendFailure.Kind.UNCONFIRMED));
      assertThat(calls.stream().filter(call -> call.startsWith("POST"))).hasSize(1);
      assertThat(events.list)
          .singleElement()
          .satisfies(
              event -> {
                assertThat(event.getKeyValuePairs())
                    .anySatisfy(
                        pair -> {
                          assertThat(pair.key).isEqualTo("cycleId");
                          assertThat(pair.value).isEqualTo(admitted);
                        });
              });
    } finally {
      logger.detachAppender(events);
      events.stop();
    }
  }

  @Test
  @DisplayName("Confirms a lost startup acknowledgement without another registration")
  void confirmsLostRegistration() {
    // Given
    loseRegistration = true;

    // When
    lifecycle.start();

    // Then
    assertThat(calls)
        .containsExactly(
            "GET /ingestion/collector-runtime",
            "PUT /ingestion/collector-runtime",
            "GET /ingestion/collector-runtime");
    assertThat(registered).isEqualTo(lifecycle.getIncarnationId());
  }

  @Test
  @DisplayName("Supersession stops new reads and never automatically registers again")
  void stopsSupersededProcess() {
    // Given
    lifecycle.start();
    CollectorLifecycle.AdmittedCycle old =
        lifecycle.admit(UUID.fromString("00000000-0000-4000-8000-000000000151"), null, 0, null);
    registered = UUID.fromString("00000000-0000-4000-8000-000000000099");
    refuseAdmission = true;

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
        () ->
            lifecycle.admit(UUID.fromString("00000000-0000-4000-8000-000000000151"), null, 0, null);

    // Then
    assertThatThrownBy(action).isInstanceOf(CollectionBackendFailure.class);
    assertThatThrownBy(old::nextReadOrdinal).isInstanceOf(IllegalStateException.class);
    int observedCalls = calls.size();
    assertThatThrownBy(
            () ->
                lifecycle.admit(
                    UUID.fromString("00000000-0000-4000-8000-000000000151"), null, 0, null))
        .isInstanceOf(IllegalStateException.class);
    assertThat(calls).hasSize(observedCalls);
    assertThat(calls.stream().filter(call -> call.startsWith("PUT"))).hasSize(1);
  }

  @Test
  @DisplayName("A validation cycle missing its candidate never becomes provider authorization")
  void refusesMissingCandidate() {
    // Given
    lifecycle.start();
    omitCandidate = true;

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
        () ->
            lifecycle.admit(null, UUID.fromString("00000000-0000-4000-8000-000000000151"), 7, null);

    // Then
    assertThatThrownBy(action).isInstanceOf(IllegalStateException.class);
    assertThat(calls.subList(2, calls.size())).containsExactly("POST /ingestion/collection-cycles");
  }

  @Test
  @DisplayName("A contradictory generated cycle never becomes provider authorization")
  void refusesContradictoryContext() {
    // Given
    lifecycle.start();
    contradictoryPurpose = true;

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
        () ->
            lifecycle.admit(UUID.fromString("00000000-0000-4000-8000-000000000151"), null, 0, null);

    // Then
    assertThatThrownBy(action).isInstanceOf(IllegalStateException.class);
  }
}
