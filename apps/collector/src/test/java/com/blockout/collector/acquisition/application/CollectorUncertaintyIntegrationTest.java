package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.ffvb.FfvbCalendarParser;
import com.blockout.collector.acquisition.ffvb.FfvbObservationReader;
import com.blockout.collector.acquisition.ffvb.FfvbStandingsParser;
import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendClient;
import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendMapperImpl;
import com.blockout.collector.acquisition.infrastructure.backend.SportingObservationClient;
import com.blockout.collector.acquisition.infrastructure.backend.SportingObservationMapperImpl;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.config.AcquisitionConfiguration;
import com.blockout.collector.config.AcquisitionProperties;
import com.blockout.collector.generated.ingestion.api.CollectionApi;
import com.blockout.collector.generated.ingestion.api.CollectorOperationsApi;
import com.blockout.collector.generated.ingestion.api.SportingApi;
import com.blockout.collector.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.collector.ingestion.IngestionTestClient;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.Charset;
import java.sql.Connection;
import java.sql.DriverManager;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

/**
 * F01 T050 response loss at a local HTTP peer, with real generated collector clients, a packaged
 * backend and F02 commits on explicitly selected disposable migrated PostgreSQL. Supplier pages are
 * fictional and served only on loopback; no provider, identity service or shared system is
 * contacted.
 */
@EnabledIfSystemProperty(named = "blockout.qualify-collector-sporting", matches = "true")
@DisplayName("Collector uncertainty before and after actual backend commits")
class CollectorUncertaintyIntegrationTest {
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000192");
  private static final UUID POOL = UUID.fromString("00000000-0000-4000-8000-000000000195");
  private static final UUID SOURCE = UUID.fromString("00000000-0000-4000-8000-000000000196");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000197");
  private static CollectorSportingRuntime runtime;
  private final List<Exchange> exchanges = new CopyOnWriteArrayList<>();
  private final AtomicBoolean drop = new AtomicBoolean();
  private HttpServer peer;
  private ExecutorService workers;
  private HttpClient forwarding;
  private IngestionTestClient transport;
  private CollectionBackend backend;
  private CollectorLifecycle lifecycle;
  private volatile String lostPath;
  private volatile boolean afterCommit;

  /** Starts the existing suite-owned executable and local signing endpoint. */
  @BeforeAll
  static void startBackend() throws Exception {
    runtime = new CollectorSportingRuntime();
  }

  /** Stops only the executable and signing endpoint owned by this suite. */
  @AfterAll
  static void stopBackend() throws Exception {
    if (runtime != null) {
      runtime.close();
    }
  }

  /** Resets only the explicitly selected disposable database and installs a local fault peer. */
  @BeforeEach
  void connectThroughPeer() throws Exception {
    try (Connection connection =
        DriverManager.getConnection(
            System.getProperty("qualification.database-url"),
            System.getProperty("qualification.migration-user"),
            System.getProperty("qualification.migration-password"))) {
      ScriptUtils.executeSqlScript(connection, new ClassPathResource("collector-sporting.sql"));
    }
    forwarding = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    workers = Executors.newFixedThreadPool(2);
    peer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    peer.setExecutor(workers);
    peer.createContext("/", this::forward);
    peer.start();
    transport = runtime.connect((request, body, execution) -> execution.execute(request, body));
    transport.api().setBasePath("http://127.0.0.1:" + peer.getAddress().getPort());
    backend =
        new CollectionBackendClient(
            new CollectorOperationsApi(transport.api()),
            new CollectionApi(transport.api()),
            new CollectionBackendMapperImpl());
    lifecycle = new CollectorLifecycle(backend);
    lifecycle.start();
  }

  /** Releases this scenario's connection pools, listener and workers. */
  @AfterEach
  void closePeer() throws Exception {
    if (transport != null) {
      transport.close();
    }
    if (peer != null) {
      peer.stop(0);
    }
    if (workers != null) {
      workers.shutdownNow();
    }
    if (forwarding != null) {
      forwarding.close();
    }
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Lost admission grants no capability while ordinary polling follows actual SQL")
  void separatesUnconfirmedAdmissionFromCommit(boolean committed) {
    // Given
    lose("/ingestion/collection-cycles", committed);

    // When / Then
    assertUnconfirmed(() -> lifecycle.admit(CONTROL, null, 0, null));
    assertLostExchange();
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM collection_cycle", Integer.class))
        .isEqualTo(committed ? 1 : 0);
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isZero();
    assertThat(exchanges).noneMatch(exchange -> exchange.path().contains("/collection-cycles/"));
    CollectionBackend.ControlWork current = currentControl();
    assertThat(current.runningCycleId() != null).isEqualTo(committed);
    if (!committed) {
      CollectorLifecycle.AdmittedCycle next =
          lifecycle.admit(CONTROL, null, current.revision(), null);
      String attempted =
          transport
              .api()
              .getJsonMapper()
              .readTree(matching().getFirst().body())
              .get("cycleId")
              .asText();
      assertThat(next.getCycle().id().toString()).isNotEqualTo(attempted);
      assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM collection_cycle", Integer.class))
          .isEqualTo(1);
    }
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Lost completion is sent once and backend terminal state owns later eligibility")
  void separatesUnconfirmedCompletionFromCommit(boolean committed) {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    lose("/ingestion/collection-cycles/" + cycle.getCycle().id() + "/completion", committed);

    // When / Then
    assertUnconfirmed(() -> lifecycle.complete(cycle, Instant.now()));
    assertLostExchange();
    assertThat(completed(cycle)).isEqualTo(committed);
    assertThat(currentControl().runningCycleId() == null).isEqualTo(committed);
    assertThat(exchanges)
        .noneMatch(
            exchange ->
                exchange.path().equals("/ingestion/collection-cycles/" + cycle.getCycle().id()));
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Qualification and completion commit together without confirmation or substitution")
  void separatesUnconfirmedValidationFromCommit(boolean committed) {
    // Given
    runtime.sql.update(
        "UPDATE sporting_season SET collection_state='PREPARING' WHERE id=?", SEASON);
    runtime.sql.update(
        "UPDATE collection_source_binding SET locked=FALSE,launched=FALSE,accepted_url=NULL,candidate_url='https://www.ffvbbeach.org/ffvbapp/resu/',validation_state='PENDING' WHERE id=?",
        SOURCE);
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(null, SOURCE, 0, null);
    lose("/ingestion/source-bindings/" + SOURCE + "/validation", committed);

    // When / Then
    assertUnconfirmed(
        () ->
            lifecycle.validate(
                cycle,
                new CollectionBackend.Validation(
                    cycle.getCycle().id(),
                    SourceValidationStateEnum.QUALIFIED,
                    Instant.now(),
                    "2026/2027",
                    null,
                    null)));
    assertLostExchange();
    assertThat(completed(cycle)).isEqualTo(committed);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT validation_state FROM collection_source_binding WHERE id=?",
                String.class,
                SOURCE))
        .isEqualTo(committed ? "QUALIFIED" : "PENDING");
    assertThat(lifecycle.work().validations()).isEmpty();
    assertThat(exchanges)
        .noneMatch(
            exchange ->
                exchange.path().endsWith("/completion")
                    || exchange.path().equals("/ingestion/source-bindings/" + SOURCE));
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Only a new useful published result recovers an uncertain sporting passage")
  void separatesUnconfirmedSportingFromCommit(boolean committed) throws Exception {
    // Given
    UUID operator = UUID.fromString("00000000-0000-4000-8000-000000195001");
    runtime.sql.update(
        "INSERT INTO account(id,issuer,subject,username,email) VALUES (?,?,'qualification-195','Qualification_195','qualification195@example.invalid') ON CONFLICT(id) DO UPDATE SET issuer=excluded.issuer",
        operator,
        runtime.issuer());
    runtime.sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'collection.manage') ON CONFLICT DO NOTHING",
        operator);
    HttpServer supplier = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    AtomicInteger providerCalls = new AtomicInteger();
    AtomicBoolean newPublication = new AtomicBoolean();
    Charset encoding = Charset.forName("windows-1252");
    String html =
        new ClassPathResource("acquisition/ffvb/calendar.html")
            .getContentAsString(java.nio.charset.StandardCharsets.UTF_8)
            .replace("ABCCS", "SYNTHETIC")
            .replace("TST", "POOL");
    String csv =
        new ClassPathResource("acquisition/ffvb/calendar.csv")
            .getContentAsString(java.nio.charset.StandardCharsets.UTF_8)
            .replace("ABCCS", "SYNTHETIC")
            .replace("TST", "POOL");
    supplier.createContext(
        "/",
        exchange -> {
          providerCalls.incrementAndGet();
          byte[] body =
              (exchange.getRequestMethod().equals("POST") ? csv : html)
                  .replace("POOL001", newPublication.get() ? "POOL003" : "POOL001")
                  .getBytes(encoding);
          try (exchange) {
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
          }
        });
    supplier.start();
    URI origin = URI.create("http://127.0.0.1:" + supplier.getAddress().getPort());
    AcquisitionProperties properties =
        new AcquisitionProperties(
            List.of(origin.toString()),
            List.of(origin.toString()),
            List.of(origin.toString()),
            Duration.ofSeconds(2),
            100_000,
            1,
            1,
            10,
            Duration.ofMinutes(1),
            Duration.ZERO,
            List.of());
    try (ProviderHttpClient http = new AcquisitionConfiguration().ffvbProviderClient(properties)) {
      runtime.sql.update(
          "UPDATE sporting_pool SET calendar_url=? WHERE id=?",
          origin.resolve("/calendar").toString(),
          POOL);
      CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
      FfvbAcquisition reader =
          new FfvbObservationReader(
              http, new FfvbCalendarParser(), new FfvbStandingsParser(), Clock.systemUTC());
      DiscoverSeasonSources discovery = mock(DiscoverSeasonSources.class);
      when(discovery.catalog(any(), any(), any()))
          .thenThrow(new FfvbAcquisitionException("Synthetic unavailable discovery"));
      CollectPassage passage =
          new CollectPassage(
              backend,
              new SportingObservationClient(
                  new SportingApi(transport.api()), new SportingObservationMapperImpl()),
              reader,
              mock(LnvAcquisition.class),
              mock(ClubSheets.class),
              mock(ClubGeocoder.class),
              discovery,
              lifecycle,
              Clock.systemUTC(),
              new CollectionStageMapperImpl());
      lose("/ingestion/pools/" + POOL + "/calendar-observations", committed);

      // When
      passage.execute(cycle);

      // Then
      assertLostExchange();
      assertThat(providerCalls).hasValue(2);
      assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
          .isEqualTo(committed ? 1 : 0);
      assertThat(
              runtime.sql.queryForObject(
                  "SELECT outcome FROM collection_result WHERE scope_id=? AND stage='CALENDAR' AND phase='INTEGRATION'",
                  String.class,
                  POOL))
          .isEqualTo("UNCONFIRMED");
      assertThat(
              runtime.sql.queryForObject(
                  "SELECT outcome FROM collection_result WHERE scope_id=? AND stage='CALENDAR' AND phase='ACQUISITION'",
                  String.class,
                  POOL))
          .isEqualTo("SUCCESS");
      assertThat(completed(cycle)).isTrue();
      assertThat(
              runtime.sql.queryForObject(
                  "SELECT last_success_at FROM collection_control WHERE id=?",
                  Instant.class,
                  CONTROL))
          .isNull();

      // An explicit passage without an eligible calendar cannot recover that calendar's evidence.
      runtime.sql.update(
          "UPDATE sporting_pool SET setting_division_id=NULL,setting_format=NULL,setting_gender=NULL WHERE id=?",
          POOL);
      passage.execute(requestManualPassage());
      assertThat(providerCalls).hasValue(2);
      assertThat(
              runtime.sql.queryForObject(
                  "SELECT outcome FROM collection_result WHERE scope_id=? AND stage='CALENDAR' AND phase='INTEGRATION'",
                  String.class,
                  POOL))
          .isEqualTo("UNCONFIRMED");

      // A new admitted manual passage reads only the supplier's current publication.
      runtime.sql.update(
          "UPDATE sporting_pool SET setting_division_id='00000000-0000-4000-8000-000000000193',setting_format='_6X6',setting_gender='MALE' WHERE id=?",
          POOL);
      newPublication.set(true);
      passage.execute(requestManualPassage());
      assertThat(providerCalls).hasValue(4);
      assertThat(matching()).hasSize(2);
      assertThat(
              runtime.sql.queryForList(
                  "SELECT reference FROM sporting_match WHERE present=TRUE", String.class))
          .containsExactly("POOL003");
      assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
          .isEqualTo(committed ? 2 : 1);
      assertThat(
              runtime.sql.queryForMap(
                  "SELECT outcome,last_success_at IS NOT NULL AS recovered FROM collection_result WHERE scope_id=? AND stage='CALENDAR' AND phase='INTEGRATION'",
                  POOL))
          .containsEntry("outcome", "SUCCESS")
          .containsEntry("recovered", true);
    } finally {
      supplier.stop(0);
    }
  }

  /**
   * Forwards real requests, closing the connection at one selected boundary without a response.
   *
   * @param exchange peer-owned inbound exchange
   * @throws IOException if the isolated forwarding boundary fails
   */
  private void forward(HttpExchange exchange) throws IOException {
    String path = exchange.getRequestURI().getPath();
    byte[] body = exchange.getRequestBody().readAllBytes();
    boolean selected = path.equals(lostPath) && drop.compareAndSet(true, false);
    if (selected && !afterCommit) {
      exchanges.add(new Exchange(path, body, false, false, 0));
      exchange.close();
      return;
    }
    HttpRequest.Builder request =
        HttpRequest.newBuilder(URI.create(runtime.baseUrl() + exchange.getRequestURI()))
            .timeout(Duration.ofSeconds(10))
            .method(exchange.getRequestMethod(), HttpRequest.BodyPublishers.ofByteArray(body));
    for (String name : List.of("Authorization", "Content-Type", "Accept")) {
      String value = exchange.getRequestHeaders().getFirst(name);
      if (value != null) {
        request.header(name, value);
      }
    }
    try {
      HttpResponse<byte[]> response =
          forwarding.send(request.build(), HttpResponse.BodyHandlers.ofByteArray());
      exchanges.add(new Exchange(path, body, true, !selected, response.statusCode()));
      if (selected) {
        exchange.close();
        return;
      }
      response
          .headers()
          .firstValue("Content-Type")
          .ifPresent(value -> exchange.getResponseHeaders().set("Content-Type", value));
      try (exchange) {
        exchange.sendResponseHeaders(response.statusCode(), response.body().length);
        exchange.getResponseBody().write(response.body());
      }
    } catch (InterruptedException failure) {
      Thread.currentThread().interrupt();
      exchange.close();
      throw new IOException("Local forwarding interrupted", failure);
    }
  }

  /**
   * Arms one deliberate response loss; all other requests keep their actual backend response.
   *
   * @param path exact mutation route selected by the scenario
   * @param committed whether to obtain the actual successful backend response before closing
   */
  private void lose(String path, boolean committed) {
    lostPath = path;
    afterCommit = committed;
    drop.set(true);
  }

  /** Checks one peer receipt, separate backend forwarding and absence of a received response. */
  private void assertLostExchange() {
    assertThat(matching()).hasSize(1);
    assertThat(matching().getFirst().forwarded()).isEqualTo(afterCommit);
    assertThat(matching().getFirst().responded()).isFalse();
    if (afterCommit) {
      assertThat(matching().getFirst().backendStatus()).isBetween(200, 299);
    }
  }

  /**
   * Requests a new ordinary manual passage with an actual local signed operator and current F12
   * grant. This explicit action is separate from the collector's uncertain mutation.
   *
   * @return newly admitted capability for exactly the returned pending request
   * @throws Exception if the isolated administrative HTTP request fails
   */
  private CollectorLifecycle.AdmittedCycle requestManualPassage() throws Exception {
    CollectionBackend.ControlWork current = currentControl();
    HttpResponse<String> response =
        forwarding.send(
            HttpRequest.newBuilder(
                    URI.create(
                        runtime.baseUrl()
                            + "/administration/collection-controls/"
                            + CONTROL
                            + "/requests"))
                .timeout(Duration.ofSeconds(10))
                .header("Authorization", "Bearer " + runtime.mobileToken("qualification-195"))
                .header("Content-Type", "application/json")
                .POST(
                    HttpRequest.BodyPublishers.ofString(
                        "{\"revision\":" + current.revision() + "}"))
                .build(),
            HttpResponse.BodyHandlers.ofString());
    assertThat(response.statusCode()).isEqualTo(202);
    CollectionBackend.ControlWork pending = currentControl();
    assertThat(pending.requestId()).isNotNull();
    return lifecycle.admit(CONTROL, null, pending.revision(), pending.requestId());
  }

  /** Returns received requests for the exact lost mutation, including an accidental replay. */
  private List<Exchange> matching() {
    return exchanges.stream().filter(exchange -> exchange.path().equals(lostPath)).toList();
  }

  /** Reads ordinary current backend eligibility without a terminal confirmation request. */
  private CollectionBackend.ControlWork currentControl() {
    return lifecycle.work().controls().stream()
        .filter(control -> control.id().equals(CONTROL))
        .findFirst()
        .orElseThrow();
  }

  /**
   * Observes durable completion independently of HTTP responses.
   *
   * @param cycle original admitted capability
   * @return actual SQL terminal state
   */
  private boolean completed(CollectorLifecycle.AdmittedCycle cycle) {
    return runtime.sql.queryForObject(
        "SELECT completed_at IS NOT NULL FROM collection_cycle WHERE id=?",
        Boolean.class,
        cycle.getCycle().id());
  }

  /**
   * Asserts the actual generated transport reports uncertainty rather than acceptance.
   *
   * @param action one collector mutation attempt
   */
  private void assertUnconfirmed(Runnable action) {
    assertThatThrownBy(action::run)
        .isInstanceOfSatisfying(
            CollectionBackendFailure.class,
            failure ->
                assertThat(failure.getKind()).isEqualTo(CollectionBackendFailure.Kind.UNCONFIRMED));
  }

  /** One observed HTTP receipt, retaining separate forwarding and client-response facts. */
  private record Exchange(
      String path, byte[] body, boolean forwarded, boolean responded, int backendStatus) {}
}
