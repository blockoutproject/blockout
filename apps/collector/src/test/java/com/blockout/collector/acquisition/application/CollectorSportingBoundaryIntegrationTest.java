package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendClient;
import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendMapperImpl;
import com.blockout.collector.acquisition.infrastructure.backend.SportingObservationClient;
import com.blockout.collector.acquisition.infrastructure.backend.SportingObservationMapperImpl;
import com.blockout.collector.generated.ingestion.ApiClient;
import com.blockout.collector.generated.ingestion.api.CollectionApi;
import com.blockout.collector.generated.ingestion.api.CollectorOperationsApi;
import com.blockout.collector.generated.ingestion.api.SportingApi;
import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;
import com.blockout.collector.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.ResultStateEnum;
import com.blockout.collector.ingestion.IngestionTestClient;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import tools.jackson.databind.JsonNode;

/**
 * Opt-in real collector → generated HTTP → executable backend → migrated PostgreSQL qualification.
 * Provider interpretation and discovery are controlled inputs; neither F01/F02 nor their transport,
 * authentication or persistence is mocked. See README for explicit disposable-resource inputs.
 */
@EnabledIfSystemProperty(named = "blockout.qualify-collector-sporting", matches = "true")
@DisplayName("Real collector-to-sporting admission, fencing and uncertainty")
class CollectorSportingBoundaryIntegrationTest {
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000192");
  private static final UUID POOL = UUID.fromString("00000000-0000-4000-8000-000000000195");
  private static final UUID SOURCE = UUID.fromString("00000000-0000-4000-8000-000000000196");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000197");
  private static final Instant NOW = Instant.parse("2026-10-24T12:00:00Z");
  private static CollectorSportingRuntime runtime;
  private final List<Request> requests = new CopyOnWriteArrayList<>();
  private final AtomicBoolean loseResponse = new AtomicBoolean();
  private boolean loseAdmissionRead;
  private Runnable beforeCalendar = () -> {};
  private String lostPath;
  private IngestionTestClient transport;
  private CollectionBackend backend;
  private SportingBackend sporting;
  private CollectorLifecycle lifecycle;

  /**
   * Starts one real backend for the suite, after explicit packaging and migration.
   *
   * @throws Exception when the required local runtime is unavailable
   */
  @BeforeAll
  static void startBackend() throws Exception {
    runtime = new CollectorSportingRuntime();
  }

  /**
   * Releases the suite-owned executable and signing endpoint.
   *
   * @throws Exception when owned runtime shutdown fails
   */
  @AfterAll
  static void stopBackend() throws Exception {
    if (runtime != null) runtime.close();
  }

  /**
   * Resets only the explicitly selected disposable database using its migration role, seeds
   * synthetic source/classification inputs and composes production collector clients.
   *
   * @throws Exception if fixture initialization fails
   */
  @BeforeEach
  void seedDatabaseAndConnect() throws Exception {
    try (Connection connection =
        DriverManager.getConnection(
            System.getProperty("qualification.database-url"),
            System.getProperty("qualification.migration-user"),
            System.getProperty("qualification.migration-password"))) {
      ScriptUtils.executeSqlScript(connection, new ClassPathResource("collector-sporting.sql"));
    }
    transport =
        runtime.connect(
            (request, body, execution) -> {
              String path = request.getURI().getPath();
              requests.add(new Request(request.getMethod(), path, body));
              if (path.endsWith("/calendar-observations")) beforeCalendar.run();
              ClientHttpResponse response = execution.execute(request, body);
              if (path.equals(lostPath)
                  && request.getMethod() != HttpMethod.GET
                  && loseResponse.compareAndSet(true, false)) {
                try (response) {
                  assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
                  throw new IOException(
                      "Synthetic lost acknowledgement after actual backend commit");
                }
              }
              if (loseAdmissionRead
                  && request.getMethod() == HttpMethod.GET
                  && path.startsWith("/ingestion/collection-cycles/")) {
                response.close();
                throw new IOException("Synthetic unavailable admission confirmation");
              }
              return response;
            });
    ApiClient api = transport.api();
    backend =
        new CollectionBackendClient(
            new CollectorOperationsApi(api),
            new CollectionApi(api),
            new CollectionBackendMapperImpl());
    sporting =
        new SportingObservationClient(new SportingApi(api), new SportingObservationMapperImpl());
    lifecycle = new CollectorLifecycle(backend);
    lifecycle.start();
  }

  /**
   * Releases this test's actual native HTTP connection pool.
   *
   * @throws Exception if pool shutdown fails
   */
  @AfterEach
  void closeTransport() throws Exception {
    if (transport != null) transport.close();
  }

  @Test
  @DisplayName(
      "Confirms lost admission before reading, allocating the sporting order before the provider")
  void confirmsAdmissionBeforeReading() {
    // Given
    lostPath = "/ingestion/collection-cycles";
    loseResponse.set(true);
    CollectorLifecycle.AdmittedCycle context = lifecycle.admit(CONTROL, null, 0, null);
    FfvbAcquisition provider = mock(FfvbAcquisition.class);
    FfvbAcquisition.Resource resource = mock(FfvbAcquisition.Resource.class);
    when(provider.resourceUrl(any()))
        .thenAnswer(call -> ((CollectionBackend.Target) call.getArgument(0)).url());
    when(provider.read(any()))
        .thenAnswer(
            call -> {
              assertThat(context.getCycle().state()).isEqualTo(CollectionCycleStateEnum.RUNNING);
              assertThat(context.getCycle().cycleOrder()).isPositive();
              assertThat(
                      count(
                          HttpMethod.GET,
                          "/ingestion/collection-cycles/" + context.getCycle().id()))
                  .isEqualTo(1);
              // Discovery consumed 1; this probe returns 3 only if calendar allocation preceded
              // read.
              assertThat(context.nextReadOrdinal()).isEqualTo(3);
              return resource;
            });
    when(resource.calendar(any()))
        .thenReturn(new FfvbAcquisition.Read<>(calendar("M1", LocalDate.of(2026, 10, 24)), NOW));

    // When
    boolean completed = passage(provider).execute(context);

    // Then
    assertThat(completed).isTrue();
    assertThat(count(HttpMethod.POST, lostPath)).isEqualTo(1);
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM collection_cycle", Integer.class))
        .isEqualTo(1);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT accepted_read_ordinal FROM sporting_match", Long.class))
        .isEqualTo(2);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT accepted_cycle_order FROM sporting_match", Long.class))
        .isEqualTo(context.getCycle().cycleOrder());
    assertThat(
            transport
                .api()
                .getJsonMapper()
                .readTree(
                    requests.stream()
                        .filter(request -> request.path().endsWith("/calendar-observations"))
                        .findFirst()
                        .orElseThrow()
                        .body())
                .at("/context/readOrdinal")
                .asLong())
        .isEqualTo(2);
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName(
      "Only backend-admitted initial imports suppress the real result announcement allowance")
  void trustsBackendImportMode(boolean initialImport) {
    // Given
    UUID request = UUID.fromString("00000000-0000-4000-8000-000000000198");
    if (initialImport) {
      runtime.sql.update(
          "UPDATE collection_control SET request_id=?, requested_mode='INITIAL_IMPORT' WHERE id=?",
          request,
          CONTROL);
      runtime.sql.update(
          "INSERT INTO collection_request_source(control_id,source_binding_id) VALUES (?,?)",
          CONTROL,
          SOURCE);
    }
    CollectorLifecycle.AdmittedCycle context =
        lifecycle.admit(CONTROL, null, 0, initialImport ? request : null);
    sporting.calendar(
        POOL,
        context(context, context.nextReadOrdinal()),
        calendar("M1", LocalDate.of(2026, 10, 24)));
    SportingObservation.Match finalMatch =
        new SportingObservation.Match(
            "M1",
            team("Home", "000192"),
            team("Away", "000193"),
            SportingObservation.Facts.builder()
                .localDate(JsonNullable.of(LocalDate.of(2026, 10, 24)))
                .result(
                    JsonNullable.of(
                        new SportingObservation.Result(ResultStateEnum.FINAL, 3, 1, null)))
                .build(),
            null);

    // When
    SportingObservation.CalendarOutcome outcome =
        sporting.calendar(
            POOL,
            context(context, context.nextReadOrdinal()),
            new SportingObservation.Calendar(true, List.of(finalMatch), List.of(), List.of()));

    // Then
    assertThat(context.getCycle().mode())
        .isEqualTo(initialImport ? CollectionModeEnum.INITIAL_IMPORT : CollectionModeEnum.PERIODIC);
    assertThat(outcome.acceptedCount()).isEqualTo(1);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT result_processed FROM match_announcement", Boolean.class))
        .isTrue();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT result_composition FROM match_announcement", String.class))
        .isEqualTo(initialImport ? null : "PLAIN_RESULT");
    JsonNode sent =
        transport.api().getJsonMapper().readTree(requests.getLast().body()).get("context");
    assertThat(sent.propertyNames())
        .containsExactlyInAnyOrder("cycleId", "readOrdinal", "observedAt");
  }

  @Test
  @DisplayName("Unconfirmed admission authorizes no provider work or second admission")
  void keepsUnconfirmedAdmissionUnusable() {
    // Given
    lostPath = "/ingestion/collection-cycles";
    loseResponse.set(true);
    loseAdmissionRead = true;

    // When / Then
    assertThatThrownBy(() -> lifecycle.admit(CONTROL, null, 0, null))
        .isInstanceOfSatisfying(
            CollectionBackendFailure.class,
            failure ->
                assertThat(failure.getKind()).isEqualTo(CollectionBackendFailure.Kind.UNCONFIRMED));
    assertThat(count(HttpMethod.POST, lostPath)).isEqualTo(1);
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM collection_cycle", Integer.class))
        .isEqualTo(1);
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isZero();
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName("Lost completion remains uncertain unless the original cycle read confirms it")
  void confirmsLostCompletion(boolean confirmationAvailable) {
    // Given
    CollectorLifecycle.AdmittedCycle context = lifecycle.admit(CONTROL, null, 0, null);
    lostPath = "/ingestion/collection-cycles/" + context.getCycle().id() + "/completion";
    loseResponse.set(true);
    loseAdmissionRead = !confirmationAvailable;
    Instant completedAt = Instant.now().truncatedTo(ChronoUnit.MICROS);

    // When
    boolean completed = lifecycle.complete(context, completedAt);

    // Then
    assertThat(completed).isEqualTo(confirmationAvailable);
    assertThat(count(HttpMethod.PUT, lostPath)).isEqualTo(1);
    assertThat(count(HttpMethod.GET, "/ingestion/collection-cycles/" + context.getCycle().id()))
        .isEqualTo(1);
    loseAdmissionRead = false;
    assertThat(backend.cycle(context.getCycle().id()).completedAt()).isEqualTo(completedAt);
  }

  @Test
  @DisplayName("A collected response cannot create sporting data after its incarnation is replaced")
  void refusesCollectedResponseAfterReplacement() {
    // Given
    CollectorLifecycle.AdmittedCycle context = lifecycle.admit(CONTROL, null, 0, null);
    sporting.calendar(
        POOL,
        context(context, context.nextReadOrdinal()),
        calendar("RETAINED", LocalDate.of(2026, 10, 24)));
    FfvbAcquisition provider = mock(FfvbAcquisition.class);
    FfvbAcquisition.Resource resource = mock(FfvbAcquisition.Resource.class);
    when(provider.resourceUrl(any()))
        .thenAnswer(call -> ((CollectionBackend.Target) call.getArgument(0)).url());
    when(provider.read(any())).thenReturn(resource);
    when(resource.calendar(any()))
        .thenReturn(new FfvbAcquisition.Read<>(calendar("LATE", LocalDate.of(2026, 10, 25)), NOW));
    beforeCalendar =
        () ->
            backend.register(
                backend.current().revision(),
                UUID.fromString("00000000-0000-4000-8000-000000000199"));

    // When
    boolean completed = passage(provider).execute(context);

    // Then
    assertThat(completed).isFalse();
    assertThat(lifecycle.isActive()).isFalse();
    assertThat(runtime.sql.queryForList("SELECT reference FROM sporting_match", String.class))
        .containsExactly("RETAINED");
    assertThat(
            runtime.sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_participation", Integer.class))
        .isEqualTo(2);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT outcome FROM collection_result WHERE scope_id=? AND stage='CALENDAR' AND phase='ACQUISITION'",
                String.class,
                POOL))
        .isEqualTo("SUCCESS");
    assertThat(
            count(
                HttpMethod.PUT,
                "/ingestion/collection-cycles/" + context.getCycle().id() + "/completion"))
        .isZero();
  }

  @Test
  @DisplayName("Later pre-read order preserves identities through postponement")
  void ordersReadsWithoutRekeyingIdentity() {
    // Given
    CollectorLifecycle.AdmittedCycle context = lifecycle.admit(CONTROL, null, 0, null);
    long older = context.nextReadOrdinal();
    long newer = context.nextReadOrdinal();
    SportingObservation.CalendarOutcome first =
        sporting.calendar(
            POOL, context(context, newer), calendar("M1", LocalDate.of(2026, 10, 25)));
    UUID match = first.outcomes().getFirst().resourceId();
    SportingObservation.Calendar oldCalendar =
        new SportingObservation.Calendar(
            true,
            List.of(
                new SportingObservation.Match(
                    "M1",
                    team("Home", "000192"),
                    team("Away", "000193"),
                    SportingObservation.Facts.builder()
                        .localDate(JsonNullable.of(LocalDate.of(2026, 10, 24)))
                        .venueName(JsonNullable.of("Late synthetic venue"))
                        .build(),
                    null)),
            List.of(),
            List.of());

    // When
    SportingObservation.CalendarOutcome late =
        sporting.calendar(POOL, context(context, older), oldCalendar);
    SportingObservation.CalendarOutcome postponed =
        sporting.calendar(
            POOL,
            context(context, context.nextReadOrdinal()),
            calendar("M1", LocalDate.of(2026, 11, 1)));

    // Then
    assertThat(late.staleCount()).isEqualTo(1);
    assertThat(runtime.sql.queryForObject("SELECT venue_name FROM sporting_match", String.class))
        .isNull();
    assertThat(postponed.outcomes().getFirst().resourceId()).isEqualTo(match);
    assertThat(postponed.outcomes().getFirst().homeTeamId())
        .isEqualTo(first.outcomes().getFirst().homeTeamId());
    assertThat(postponed.outcomes().getFirst().awayTeamId())
        .isEqualTo(first.outcomes().getFirst().awayTeamId());
    assertThat(runtime.sql.queryForObject("SELECT local_date FROM sporting_match", LocalDate.class))
        .isEqualTo(LocalDate.of(2026, 11, 1));
    assertThat(
            runtime.sql.queryForObject(
                "SELECT season_id FROM sporting_pool WHERE id=?", UUID.class, POOL))
        .isEqualTo(SEASON);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_participation", Integer.class))
        .isEqualTo(2);
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(1);
  }

  @Test
  @DisplayName(
      "Lost sporting acknowledgement retains commits and records uncertainty without replay")
  void preservesUncertainSportingCommit() {
    // Given
    CollectorLifecycle.AdmittedCycle context = lifecycle.admit(CONTROL, null, 0, null);
    lostPath = "/ingestion/pools/" + POOL + "/calendar-observations";
    loseResponse.set(true);
    FfvbAcquisition provider = mock(FfvbAcquisition.class);
    FfvbAcquisition.Resource resource = mock(FfvbAcquisition.Resource.class);
    when(provider.resourceUrl(any()))
        .thenAnswer(call -> ((CollectionBackend.Target) call.getArgument(0)).url());
    when(provider.read(any())).thenReturn(resource);
    when(resource.calendar(any()))
        .thenReturn(new FfvbAcquisition.Read<>(calendar("M1", LocalDate.of(2026, 10, 24)), NOW));

    // When
    boolean completed = passage(provider).execute(context);

    // Then
    assertThat(completed).isTrue();
    assertThat(count(HttpMethod.POST, lostPath)).isEqualTo(1);
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(1);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT outcome FROM collection_result WHERE scope_id=? AND stage='CALENDAR' AND phase='ACQUISITION'",
                String.class,
                POOL))
        .isEqualTo("SUCCESS");
    assertThat(
            runtime.sql.queryForObject(
                "SELECT outcome FROM collection_result WHERE scope_id=? AND stage='CALENDAR' AND phase='INTEGRATION'",
                String.class,
                POOL))
        .isEqualTo("UNCONFIRMED");
    assertThat(backend.cycle(context.getCycle().id()).state())
        .isEqualTo(CollectionCycleStateEnum.COMPLETED);
  }

  @Test
  @DisplayName(
      "Incarnation replacement waits for the sporting commit and rejects subsequent old work")
  void fencesThroughSportingCommit() throws Exception {
    // Given
    CollectorLifecycle.AdmittedCycle context = lifecycle.admit(CONTROL, null, 0, null);
    UUID match =
        sporting
            .calendar(POOL, context(context, 1), calendar("M1", LocalDate.of(2026, 10, 24)))
            .outcomes()
            .getFirst()
            .resourceId();
    long revision = backend.current().revision();
    try (Connection blocker = runtime.sql.getDataSource().getConnection();
        ExecutorService workers = Executors.newFixedThreadPool(2)) {
      blocker.setAutoCommit(false);
      int blockerPid;
      try (java.sql.Statement statement = blocker.createStatement();
          java.sql.ResultSet pid = statement.executeQuery("SELECT pg_backend_pid()")) {
        assertThat(pid.next()).isTrue();
        blockerPid = pid.getInt(1);
      }
      try (java.sql.PreparedStatement lock =
          blocker.prepareStatement("SELECT id FROM sporting_match WHERE id=? FOR UPDATE")) {
        lock.setObject(1, match);
        lock.executeQuery().close();
      }
      try {
        Future<SportingObservation.Outcome> accepting =
            workers.submit(
                () ->
                    sporting.detail(
                        match,
                        context(context, 2),
                        SportingObservation.Facts.builder()
                            .localDate(JsonNullable.of(LocalDate.of(2026, 10, 25)))
                            .build()));
        int acceptingPid = awaitBlockedBy(blockerPid);
        UUID next = UUID.fromString("00000000-0000-4000-8000-000000000199");
        Future<CollectionBackend.Runtime> replacing =
            workers.submit(() -> backend.register(revision, next));

        // When
        try {
          awaitBlockedBy(acceptingPid);
        } finally {
          blocker.commit();
        }
        assertThat(accepting.get(10, TimeUnit.SECONDS).outcome())
            .isEqualTo(ObservationOutcomeEnum.ACCEPTED);
        assertThat(replacing.get(10, TimeUnit.SECONDS).incarnationId()).isEqualTo(next);

        // Then
        assertThat(
                runtime.sql.queryForObject(
                    "SELECT local_date FROM sporting_match WHERE id=?", LocalDate.class, match))
            .isEqualTo(LocalDate.of(2026, 10, 25));
        assertThatThrownBy(
                () ->
                    sporting.calendar(
                        POOL, context(context, 3), calendar("LATE", LocalDate.of(2026, 10, 26))))
            .isInstanceOfSatisfying(
                CollectionBackendFailure.class,
                failure ->
                    assertThat(failure.getKind())
                        .isEqualTo(CollectionBackendFailure.Kind.CONFLICT));
        assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
            .isEqualTo(1);
        assertThat(backend.cycle(context.getCycle().id()).state())
            .isEqualTo(CollectionCycleStateEnum.INTERRUPTED);
      } finally {
        blocker.rollback();
      }
    }
  }

  /**
   * Observes a real blocked PostgreSQL statement, avoiding scheduler sleeps or future timing
   * claims.
   *
   * @param blockerPid exact connection holding the conflicting root
   * @return connection whose real lock wait has been observed
   */
  private int awaitBlockedBy(int blockerPid) {
    List<Integer> blocked =
        await()
            .atMost(Duration.ofSeconds(10))
            .until(
                () ->
                    runtime.sql.queryForList(
                        "SELECT pid FROM pg_stat_activity WHERE ? = ANY(pg_blocking_pids(pid))",
                        Integer.class,
                        blockerPid),
                pids -> !pids.isEmpty());
    assertThat(blocked).hasSize(1);
    return blocked.getFirst();
  }

  /**
   * Builds the real passage with synthetic provider inputs; discovery uses a measured failed read
   * so the already qualified calendar remains eligible, without inventing provider qualification.
   *
   * @param provider controlled supplier boundary for this scenario
   * @return production passage with real admission, sporting and completion clients
   */
  private CollectPassage passage(FfvbAcquisition provider) {
    DiscoverSeasonSources discovery = mock(DiscoverSeasonSources.class);
    when(discovery.catalog(any(), any(), any()))
        .thenThrow(new FfvbAcquisitionException("Synthetic unavailable discovery"));
    return new CollectPassage(
        backend,
        sporting,
        provider,
        mock(LnvAcquisition.class),
        mock(ClubSheets.class),
        mock(MunicipalGeocoder.class),
        discovery,
        lifecycle,
        Clock.systemUTC());
  }

  /**
   * Creates an attributable single-match calendar without optional provider facts.
   *
   * @param reference native match identity
   * @param date proposed known date
   * @return complete synthetic calendar
   */
  private SportingObservation.Calendar calendar(String reference, LocalDate date) {
    return new SportingObservation.Calendar(
        true,
        List.of(
            new SportingObservation.Match(
                reference,
                team("Home", "000192"),
                team("Away", "000193"),
                SportingObservation.Facts.builder().localDate(JsonNullable.of(date)).build(),
                null)),
        List.of(),
        List.of());
  }

  /**
   * Creates an exact FFVB participant, retaining its leading-zero club reference.
   *
   * @param name source team label
   * @param club exact native club reference
   * @return synthetic participant proposal
   */
  private SportingObservation.Team team(String name, String club) {
    return new SportingObservation.Team(name, null, club, null);
  }

  /**
   * Carries only the admitted identity and read attribution; mode/order remain backend-owned.
   *
   * @param cycle real F01 admission
   * @param ordinal allocated before the synthetic supplier read
   * @return generated-client application context
   */
  private SportingObservation.Context context(
      CollectorLifecycle.AdmittedCycle cycle, long ordinal) {
    return new SportingObservation.Context(cycle.getCycle().id(), ordinal, NOW, null);
  }

  /**
   * Counts actual generated exchanges, including attempts whose response was intentionally lost.
   *
   * @param method exact HTTP method
   * @param path exact canonical resource
   * @return number of observed attempts
   */
  private long count(HttpMethod method, String path) {
    return requests.stream()
        .filter(request -> request.method() == method && request.path().equals(path))
        .count();
  }

  /**
   * One recorded native exchange; JSON is decoded only by assertions that inspect a payload.
   *
   * @param method actual HTTP method
   * @param path canonical resource path, without credentials
   * @param body synthetic request bytes supplied by the native interceptor
   */
  private record Request(HttpMethod method, String path, byte[] body) {}
}
