package com.blockout.backend.collection.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.CloseCollectionSeason;
import com.blockout.backend.collection.application.service.ReadCollectionConfiguration;
import com.blockout.backend.collection.application.service.ReadCollectionWork;
import com.blockout.backend.collection.application.service.RecordCollectionResults;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.sporting.application.model.AcquisitionReference;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.application.service.ReadCollectionSeasons;
import com.blockout.backend.sporting.application.service.ReadSportingAcquisition;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import jakarta.persistence.EntityManagerFactory;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Real generated HTTP, F12 admission, account grants and committed PostgreSQL command effects. */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Collection control commands on PostgreSQL")
class CollectionControlIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000183");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000184");
  private static final UUID SOURCE = UUID.fromString("00000000-0000-4000-8000-000000000185");
  private static final UUID STARTUP = UUID.fromString("00000000-0000-4000-8000-000000000186");
  private static final UUID CYCLE = UUID.fromString("00000000-0000-4000-8000-000000000187");
  @Autowired private MockMvc mvc;
  @Autowired private JdbcTemplate sql;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private ReadCollectionSeasons seasonReads;
  @Autowired private RegisterCollectorRuntime runtimes;
  @Autowired private AdmitCollectionCycle cycles;
  @Autowired private ReadCollectionWork collectionWork;
  @Autowired private RecordCollectionResults results;
  @Autowired private CollectionStore store;

  @Autowired
  private com.blockout.backend.collection.application.service.ChangeCollectionControls controls;

  @Autowired private ReadCollectionConfiguration configurationReads;

  @Autowired private ReadSportingData sporting;
  @Autowired private ReadSportingAcquisition acquisitionReads;
  @Autowired private CloseCollectionSeason closure;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private EntityManagerFactory entityManagerFactory;
  private UUID season;

  /**
   * Uses the real role setup and migrations in a suite-owned dynamic-port database.
   *
   * @param properties application bindings for this disposable database
   * @throws Exception if the disposable baseline cannot be migrated
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /** Prepares only this disposable database, with maintenance active and no bypass grant. */
  @BeforeEach
  void prepare() throws Exception {
    try (Connection connection =
            DriverManager.getConnection(
                DATABASE.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement cleanup = connection.createStatement()) {
      cleanup.execute("TRUNCATE collection_cycle, sporting_season, account CASCADE");
    }
    sql.update(
        "INSERT INTO collection_control(id, family, enabled) VALUES ('00000000-0000-4000-8000-000000000001','CLUB_SHEETS',true), ('00000000-0000-4000-8000-000000000002','GEOCODING',true)");
    sql.update("UPDATE collector_runtime SET incarnation_id=NULL, revision=0 WHERE id=1");
    sql.update(
        "UPDATE collection_control SET enabled=true, request_id=NULL, requested_mode=NULL, current_cycle_id=NULL, revision=0");
    sql.update("UPDATE access_settings SET active=true WHERE id='maintenance'");
    sql.update(
        "INSERT INTO account(id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', 'auth0|183', 'Operator_183', 'operator@example.invalid')",
        ACCOUNT);
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'collection.manage')",
        ACCOUNT);
    season = seasons.getOrCreate(2026).id();
    sql.update("UPDATE sporting_season SET collection_state='ACTIVE' WHERE id=?", season);
    sql.update(
        "INSERT INTO collection_source_binding(id, season_id, provider, organizer_reference, accepted_url, candidate_url, locked, launched, validation_state) VALUES (?, ?, 'FFVB', 'ABCCS', 'https://www.ffvbbeach.org/source', 'https://www.ffvbbeach.org/source', true, true, 'QUALIFIED')",
        SOURCE,
        season);
    sql.update(
        "INSERT INTO collection_control(id, season_id, family, enabled) VALUES (?, ?, 'FFVB', true)",
        CONTROL,
        season);
    runtimes.register(0, STARTUP);
  }

  @Test
  @DisplayName("Control lists isolate the selected season and preserve family ordering")
  void listsSelectedScope() {
    // Given
    UUID professional = UUID.fromString("00000000-0000-4000-8000-000000000003");
    UUID otherSeason = seasons.getOrCreate(2027).id();
    sql.update(
        "INSERT INTO collection_control(id, season_id, family, enabled) VALUES (?, ?, 'LNV', true), (?, ?, 'LNV', true)",
        professional,
        season,
        UUID.fromString("00000000-0000-4000-8000-000000000194"),
        otherSeason);

    // When
    List<CollectionState.ControlView> seasonal = configurationReads.controls(ACCOUNT, season);
    List<CollectionState.ControlView> seasonless = configurationReads.controls(ACCOUNT, null);

    // Then
    assertThat(seasonal)
        .extracting(view -> view.control().id())
        .containsExactly(CONTROL, professional);
    assertThat(seasonless)
        .extracting(view -> view.control().id())
        .containsExactly(
            UUID.fromString("00000000-0000-4000-8000-000000000001"),
            UUID.fromString("00000000-0000-4000-8000-000000000002"));
  }

  @Test
  @DisplayName("Lists retained control cycles together while preserving family order")
  void readsControlCyclesTogether() {
    // Given
    CollectionState.Cycle running =
        cycles
            .admit(new CollectionState.StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null))
            .cycle();
    UUID professional = UUID.fromString("00000000-0000-4000-8000-000000000003");
    UUID completedCycle = UUID.fromString("00000000-0000-4000-8000-000000000195");
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    boolean enabled = statistics.isStatisticsEnabled();
    statistics.setStatisticsEnabled(true);
    try {
      long before = statistics.getPrepareStatementCount();
      configurationReads.controls(ACCOUNT, season);
      long singleCycleReads = statistics.getPrepareStatementCount() - before;
      sql.update(
          "INSERT INTO collection_control(id, season_id, family, enabled, current_cycle_id) VALUES (?, ?, 'LNV', TRUE, ?)",
          professional,
          season,
          completedCycle);
      sql.update(
          "INSERT INTO collection_cycle(cycle_order, id, incarnation_id, control_id, started_at, completed_at) VALUES (nextval('collection_cycle_order'), ?, ?, ?, ?, ?)",
          completedCycle,
          STARTUP,
          professional,
          Timestamp.from(running.startedAt()),
          Timestamp.from(running.startedAt().plusSeconds(1)));
      before = statistics.getPrepareStatementCount();

      // When
      List<CollectionState.ControlView> views = configurationReads.controls(ACCOUNT, season);
      long listReads = statistics.getPrepareStatementCount() - before;

      // Then
      assertThat(views)
          .extracting(view -> view.control().id())
          .containsExactly(CONTROL, professional);
      assertThat(views)
          .extracting(view -> view.cycle().state())
          .containsExactly(CollectionCycleStateEnum.RUNNING, CollectionCycleStateEnum.COMPLETED);
      assertThat(listReads).isEqualTo(singleCycleReads);
    } finally {
      statistics.setStatisticsEnabled(enabled);
    }
  }

  @Test
  @DisplayName(
      "An authorized request remains pending under actual maintenance and repeated reads create no work")
  void onePendingRequest() throws Exception {
    // Given
    // The isolated active season has the current account grant and actual F12 maintenance.

    // When
    ResultActions firstRequest = request(0);
    CollectionState.Control pending = configurationReads.control(ACCOUNT, CONTROL).control();
    ResultActions repeatedRequest = request(pending.revision());
    long repeatedRevision = configurationReads.control(ACCOUNT, CONTROL).control().revision();
    ResultActions currentControl =
        mvc.perform(get("/administration/collection-controls/{id}", CONTROL).with(operator()));
    ResultActions staleRequest = request(0);

    // Then
    firstRequest
        .andExpect(status().isAccepted())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.cycle").doesNotExist());
    assertThat(pending.requestId()).isNotNull();
    repeatedRequest
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.pendingRequestId").value(pending.requestId().toString()));
    assertThat(repeatedRevision).isEqualTo(pending.revision());
    currentControl
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pendingRequestId").value(pending.requestId().toString()));
    assertThat(sql.queryForObject("SELECT count(*) FROM collection_cycle", Integer.class)).isZero();
    staleRequest
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:stale-revision"));
  }

  @Test
  @DisplayName("Pause cancels pending intent and resume restores eligibility without replay")
  void pauseResume() throws Exception {
    // Given
    ResultActions pendingRequest = request(0);
    long revision = configurationReads.control(ACCOUNT, CONTROL).control().revision();

    // When
    ResultActions pause = activity(revision, false);
    CollectionState.Control paused = configurationReads.control(ACCOUNT, CONTROL).control();
    ResultActions refusedRequest = request(paused.revision());
    ResultActions unchangedPause = activity(paused.revision(), false);
    ResultActions resume = activity(paused.revision(), true);

    // Then
    pendingRequest.andExpect(status().isAccepted());
    pause.andExpect(status().isOk()).andExpect(jsonPath("$.pendingRequestId").isEmpty());
    refusedRequest.andExpect(status().isConflict());
    unchangedPause
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revision").value(paused.revision()));
    resume.andExpect(status().isOk()).andExpect(jsonPath("$.pendingRequestId").isEmpty());
    assertThat(sql.queryForObject("SELECT count(*) FROM collection_cycle", Integer.class)).isZero();
  }

  @Test
  @DisplayName(
      "Running work is returned once but pausing refuses the duplicate and lets admitted work finish")
  void drainsRunning() throws Exception {
    // Given
    cycles.admit(new CollectionState.StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));
    long revision = configurationReads.control(ACCOUNT, CONTROL).control().revision();

    // When
    ResultActions currentRun = request(revision);
    ResultActions pause = activity(revision, false);
    ResultActions refusedRequest =
        request(configurationReads.control(ACCOUNT, CONTROL).control().revision());
    results.complete(CYCLE, Instant.now().plusSeconds(1));

    // Then
    currentRun.andExpect(status().isOk()).andExpect(jsonPath("$.cycle.id").value(CYCLE.toString()));
    pause.andExpect(status().isOk());
    refusedRequest.andExpect(status().isConflict());
    assertThat(collectionWork.get(CYCLE).state()).isEqualTo(CollectionCycleStateEnum.COMPLETED);
    assertThat(configurationReads.control(ACCOUNT, CONTROL).control().lastSuccessAt()).isNull();
  }

  @Test
  @DisplayName("Grant withdrawal is checked before returning an already pending request")
  void currentGrantBeforeDuplicate() throws Exception {
    // Given
    request(0).andExpect(status().isAccepted());
    CollectionState.Control pending = configurationReads.control(ACCOUNT, CONTROL).control();
    sql.update("DELETE FROM account_permission WHERE account_id=?", ACCOUNT);

    // When
    ResultActions response = request(pending.revision());

    // Then
    response.andExpect(status().isForbidden());
    assertThat(
            sql.queryForObject(
                "SELECT request_id FROM collection_control WHERE id=?", UUID.class, CONTROL))
        .isEqualTo(pending.requestId());
  }

  @Test
  @DisplayName(
      "Closure checks exact canonical label and revision before cancelling only this season")
  void exactTerminalClosure() throws Exception {
    // Given
    request(0).andExpect(status().isAccepted());

    // When
    ResultActions invalidLabel = close(0, "2026/2027 ");
    ResultActions staleRevision = close(1, "2026/2027");
    UUID retainedRequest = configurationReads.control(ACCOUNT, CONTROL).control().requestId();
    ResultActions closureResponse = close(0, "2026/2027");
    CollectionState.Control closed = configurationReads.control(ACCOUNT, CONTROL).control();
    ResultActions refusedResume = activity(closed.revision(), true);
    ResultActions refusedRequest = request(closed.revision());
    ResultActions refusedClosure = close(1, "2026/2027");
    ResultActions remainingControls =
        mvc.perform(get("/administration/collection-controls").with(operator()));

    // Then
    invalidLabel.andExpect(status().isUnprocessableContent());
    staleRevision.andExpect(status().isConflict());
    assertThat(retainedRequest).isNotNull();
    closureResponse.andExpect(status().isOk()).andExpect(jsonPath("$.state").value("closed"));
    assertThat(closed.requestId()).isNull();
    assertThat(store.source(SOURCE).orElseThrow().locked()).isTrue();
    refusedResume.andExpect(status().isConflict());
    refusedRequest.andExpect(status().isConflict());
    refusedClosure.andExpect(status().isConflict());
    remainingControls.andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(2));
    assertThat(
            sql.queryForObject(
                "SELECT count(*) FROM collection_control WHERE season_id IS NULL AND enabled=true",
                Integer.class))
        .isEqualTo(2);
  }

  @Test
  @DisplayName(
      "A cycle admitted before closure may finish once, while every new admission is refused")
  void closureAfterAdmission() throws Exception {
    // Given
    cycles.admit(new CollectionState.StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));

    // When
    ResultActions closureResponse = close(0, "2026/2027");
    results.complete(CYCLE, Instant.now().plusSeconds(1));
    Throwable refusedAdmission =
        catchThrowable(
            () ->
                cycles.admit(
                    new CollectionState.StartCycle(
                        UUID.fromString("00000000-0000-4000-8000-000000000199"),
                        STARTUP,
                        CONTROL,
                        null,
                        configurationReads.control(ACCOUNT, CONTROL).control().revision(),
                        null)));

    // Then
    closureResponse.andExpect(status().isOk());
    assertThat(collectionWork.get(CYCLE).state()).isEqualTo(CollectionCycleStateEnum.COMPLETED);
    assertThat(refusedAdmission).isInstanceOf(CollectionConflictException.class);
  }

  @Test
  @DisplayName(
      "Seasonal closure preserves another season's pending request and both seasonless controls")
  void independentScopes() throws Exception {
    // Given
    // The isolated active season has the current account grant and actual F12 maintenance.

    UUID otherSeason = seasons.getOrCreate(2027).id();
    UUID otherControl = UUID.fromString("00000000-0000-4000-8000-000000000194");
    UUID otherRequest = UUID.fromString("00000000-0000-4000-8000-000000000195");
    sql.update(
        "INSERT INTO collection_control(id, season_id, family, enabled, request_id, requested_mode) VALUES (?, ?, 'LNV', true, ?, 'MANUAL')",
        otherControl,
        otherSeason,
        otherRequest);
    // When
    ResultActions response = close(0, "2026/2027");

    // Then
    response.andExpect(status().isOk());
    assertThat(
            sql.queryForObject(
                "SELECT request_id FROM collection_control WHERE id=?", UUID.class, otherControl))
        .isEqualTo(otherRequest);
    assertThat(
            sql.queryForObject(
                "SELECT revision FROM collection_control WHERE id=?", Long.class, otherControl))
        .isZero();
    assertThat(
            sql.queryForObject(
                "SELECT count(*) FROM collection_control WHERE season_id IS NULL AND enabled=true AND revision=0",
                Integer.class))
        .isEqualTo(2);
  }

  @Test
  @DisplayName(
      "Exhausted control revisions refuse pending cancellation and roll back the entire closure")
  void refusesRevisionOverflowAtomically() throws Exception {
    // Given
    request(0).andExpect(status().isAccepted());
    sql.update("UPDATE collection_control SET revision=9007199254740991 WHERE id=?", CONTROL);

    // When
    ResultActions response = close(0, "2026/2027");

    // Then
    response.andExpect(status().isConflict());
    assertThat(seasonReads.collectionState(season).collectionRevision()).isZero();
    assertThat(configurationReads.control(ACCOUNT, CONTROL).control().requestId()).isNotNull();
  }

  @Test
  @DisplayName("A revoked grant cannot close history or return an existing running execution")
  void deniesRevokedRunningAndClosure() throws Exception {
    // Given
    cycles.admit(new CollectionState.StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));
    long revision = configurationReads.control(ACCOUNT, CONTROL).control().revision();
    sql.update("DELETE FROM account_permission WHERE account_id=?", ACCOUNT);

    // When
    ResultActions runningResponse = request(revision);
    ResultActions closureResponse = close(0, "2026/2027");

    // Then
    runningResponse.andExpect(status().isForbidden());
    closureResponse.andExpect(status().isForbidden());
    assertThat(seasonReads.collectionState(season).collectionRevision()).isZero();
  }

  @Test
  @DisplayName(
      "An unlaunched provider cannot request or resume while another provider's season is active")
  void refusesUnlaunchedProvider() throws Exception {
    // Given
    sql.update("UPDATE collection_source_binding SET launched=false WHERE id=?", SOURCE);

    // When
    ResultActions requestResponse = request(0);
    sql.update("UPDATE collection_control SET enabled=false WHERE id=?", CONTROL);
    ResultActions resumeResponse = activity(0, true);

    // Then
    requestResponse.andExpect(status().isConflict());
    resumeResponse.andExpect(status().isConflict());
    assertThat(configurationReads.control(ACCOUNT, CONTROL).control().requestId()).isNull();
  }

  @Test
  @DisplayName("Closure commits before a waiting admission and leaves no newly admitted cycle")
  void closureWinsAdmissionRace() throws Exception {
    // Given
    // The isolated active season has the current account grant and actual F12 maintenance.

    CountDownLatch held = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    CompletableFuture<Integer> admissionPid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?> closing =
          workers.submit(
              () ->
                  transaction.executeWithoutResult(
                      status -> {
                        closure.close(ACCOUNT, season, 0, "2026/2027");
                        held.countDown();
                        awaitRelease(release);
                      }));
      try {
        assertThat(held.await(10, TimeUnit.SECONDS)).isTrue();
        Future<?> admission =
            workers.submit(
                () ->
                    transaction.executeWithoutResult(
                        status -> {
                          admissionPid.complete(
                              sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                          cycles.admit(
                              new CollectionState.StartCycle(
                                  CYCLE, STARTUP, CONTROL, null, 0, null));
                        }));
        PostgresTestDatabase.awaitBlocked(sql, admissionPid);
        release.countDown();
        closing.get(10, TimeUnit.SECONDS);
        Throwable rejected = catchThrowable(() -> admission.get(10, TimeUnit.SECONDS));

        // Then
        assertThat(rejected).hasCauseInstanceOf(CollectionConflictException.class);
      } finally {
        release.countDown();
      }
    }
    // Then
    assertThat(sql.queryForObject("SELECT count(*) FROM collection_cycle", Integer.class)).isZero();
  }

  @Test
  @DisplayName("Admission commits before waiting closure; only the admitted execution may drain")
  void admissionWinsClosureRace() throws Exception {
    // Given
    // The isolated active season has the current account grant and actual F12 maintenance.

    CountDownLatch held = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    CompletableFuture<Integer> closurePid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?> admission =
          workers.submit(
              () ->
                  transaction.executeWithoutResult(
                      status -> {
                        cycles.admit(
                            new CollectionState.StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));
                        held.countDown();
                        awaitRelease(release);
                      }));
      try {
        assertThat(held.await(10, TimeUnit.SECONDS)).isTrue();
        Future<?> closing =
            workers.submit(
                () ->
                    transaction.executeWithoutResult(
                        status -> {
                          closurePid.complete(
                              sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                          closure.close(ACCOUNT, season, 0, "2026/2027");
                        }));
        PostgresTestDatabase.awaitBlocked(sql, closurePid);
        release.countDown();
        admission.get(10, TimeUnit.SECONDS);
        closing.get(10, TimeUnit.SECONDS);
      } finally {
        release.countDown();
      }
    }
    results.complete(CYCLE, Instant.now().plusSeconds(1));

    // Then
    assertThat(collectionWork.get(CYCLE).state()).isEqualTo(CollectionCycleStateEnum.COMPLETED);
  }

  /**
   * Holds the transaction for a proven competing SQL lock, with a bounded release on failures.
   *
   * @param release latch released after the competing transaction is observably waiting
   */
  private void awaitRelease(CountDownLatch release) {
    try {
      if (!release.await(10, TimeUnit.SECONDS))
        throw new IllegalStateException("Test release timed out");
    } catch (InterruptedException failure) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException(failure);
    }
  }

  @ParameterizedTest
  @CsvSource({"-3601,false", "-3600,true", "14400,true", "14401,false"})
  @DisplayName(
      "Real F02 match and pool windows include exactly H−1 through H+4 even after final sets")
  void exactFastWindows(long offset, boolean fast) {
    // Given
    UUID pool = prepareProfessionalMatch();
    Instant start = Instant.parse("2026-10-24T12:00:00Z");
    Instant now = start.plusSeconds(offset);

    // When
    List<AcquisitionReference> details = acquisitionReads.acquisitionDetails(pool, now, 0);
    List<AcquisitionReference> pools =
        acquisitionReads.acquisitionPools(
            season, CollectionProviderEnum.LNV, "LNV", false, now, null);

    // Then
    assertThat(details).hasSize(1);
    assertThat(details.getFirst().fastWindowEndsAt())
        .isEqualTo(fast ? start.plusSeconds(14400) : null);
    assertThat(pools).hasSize(1);
    assertThat(pools.getFirst().fastWindowEndsAt())
        .isEqualTo(fast ? start.plusSeconds(14400) : null);
  }

  @Test
  @DisplayName("Unknown and corrected reliable start times supply no stale fast window")
  void currentReliableTimeOnly() {
    // Given
    UUID pool = prepareProfessionalMatch();
    Instant now = Instant.parse("2026-10-24T12:00:00Z");
    sql.update("UPDATE sporting_match SET reliable_start=NULL WHERE pool_id=?", pool);

    // When
    List<AcquisitionReference> unknownDetails = acquisitionReads.acquisitionDetails(pool, now, 0);
    sql.update(
        "UPDATE sporting_match SET reliable_start=? WHERE pool_id=?",
        Timestamp.from(now.plusSeconds(7200)),
        pool);
    List<AcquisitionReference> correctedDetails = acquisitionReads.acquisitionDetails(pool, now, 0);
    List<AcquisitionReference> correctedPools =
        acquisitionReads.acquisitionPools(
            season, CollectionProviderEnum.LNV, "LNV", false, now, null);

    // Then
    assertThat(unknownDetails.getFirst().fastWindowEndsAt()).isNull();
    assertThat(correctedDetails.getFirst().fastWindowEndsAt()).isNull();
    assertThat(correctedPools.getFirst().fastWindowEndsAt()).isNull();
  }

  /**
   * Constructs one eligible professional match with final sets; no live provider is contacted.
   *
   * @return pool whose match has the scenario's fixed reliable start time
   */
  private UUID prepareProfessionalMatch() {
    UUID division = UUID.fromString("00000000-0000-4000-8000-000000000188");
    UUID pack = UUID.fromString("00000000-0000-4000-8000-000000000189");
    UUID pool = UUID.fromString("00000000-0000-4000-8000-000000000190");
    UUID home = UUID.fromString("00000000-0000-4000-8000-000000000191");
    UUID away = UUID.fromString("00000000-0000-4000-8000-000000000192");
    UUID match = UUID.fromString("00000000-0000-4000-8000-000000000193");
    sql.update(
        "INSERT INTO sporting_division(id, name, active, color) VALUES (?, 'Synthetic professional', true, '#112233') ON CONFLICT(id) DO NOTHING",
        division);
    sql.update(
        "INSERT INTO sporting_pack(id, season_id, provider, organizer_reference, reference) VALUES (?, ?, 'LNV', 'LNV', 'Championship')",
        pack,
        season);
    sql.update(
        "INSERT INTO sporting_pool(id, season_id, pack_id, provider, organizer_reference, competition_reference, reference, source_name, calendar_url, setting_division_id, setting_format, setting_gender) VALUES (?, ?, ?, 'LNV', 'LNV', 'Championship', 'A', 'Synthetic pool', 'https://lnv.example.invalid/calendar', ?, '_6X6', 'MIXED')",
        pool,
        season,
        pack,
        division);
    for (UUID team : List.of(home, away)) {
      sql.update(
          "INSERT INTO sporting_team(id, season_id, provider, organizer_reference, competition_reference, native_reference, source_name, comparison_name, division_id, format, gender) VALUES (?, ?, 'LNV', 'LNV', 'Championship', ?, 'Synthetic team', ?, ?, '_6X6', 'MIXED')",
          team,
          season,
          team.toString(),
          team.toString(),
          division);
    }
    sql.update(
        "INSERT INTO sporting_match(id, pool_id, reference, home_team_id, away_team_id, detail_url, reliable_start) VALUES (?, ?, 'Match', ?, ?, 'https://lnv.example.invalid/detail', ?)",
        match,
        pool,
        home,
        away,
        Timestamp.from(Instant.parse("2026-10-24T12:00:00Z")));
    sql.update(
        "UPDATE sporting_match SET home_sets=3, away_sets=0, sets_available=true WHERE id=?",
        match);
    return pool;
  }

  /**
   * Sends one explicit manual intent at the revision read by the operator.
   *
   * @param revision last-read control revision
   * @return response for scenario-owned assertions
   */
  private ResultActions request(long revision) throws Exception {
    return mvc.perform(
        post("/administration/collection-controls/{id}/requests", CONTROL)
            .with(operator())
            .contentType("application/json")
            .content("{\"revision\":" + revision + "}"));
  }

  /**
   * Replaces desired activity without any provider interaction.
   *
   * @param revision last-read control revision
   * @param enabled desired eligibility
   * @return response for scenario-owned assertions
   */
  private ResultActions activity(long revision, boolean enabled) throws Exception {
    return mvc.perform(
        put("/administration/collection-controls/{id}/activity", CONTROL)
            .with(operator())
            .contentType("application/json")
            .content("{\"revision\":" + revision + ",\"enabled\":" + enabled + "}"));
  }

  /**
   * Sends the exact typed canonical label, without normalization.
   *
   * @param revision last-read season revision
   * @param confirmation scenario's exact confirmation, including any deliberate mismatch
   * @return response for scenario-owned assertions
   */
  private ResultActions close(long revision, String confirmation) throws Exception {
    return mvc.perform(
        post("/administration/collection-seasons/{id}/closure", season)
            .with(operator())
            .contentType("application/json")
            .content("{\"revision\":" + revision + ",\"confirmation\":\"" + confirmation + "\"}"));
  }

  /**
   * Supplies the real account principal; SQL owns its current permissions.
   *
   * @return authenticated mobile principal without a maintenance bypass grant
   */
  private RequestPostProcessor operator() {
    return jwt()
        .jwt(
            token ->
                token
                    .issuer("https://identity.example.invalid/")
                    .subject("auth0|183")
                    .claim("azp", "mobile-test"));
  }
}
