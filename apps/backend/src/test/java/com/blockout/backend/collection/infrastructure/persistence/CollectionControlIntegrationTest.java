package com.blockout.backend.collection.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
import com.blockout.backend.collection.application.service.CloseCollectionSeason;
import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.collection.application.service.CollectionResultService;
import com.blockout.backend.collection.application.service.CollectorRuntimeService;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.sporting.application.model.AcquisitionReference;
import com.blockout.backend.sporting.application.service.SeasonService;
import com.blockout.backend.sporting.application.service.SportingReadService;
import com.blockout.backend.testsupport.PostgresTestDatabase;
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
  @Autowired private SeasonService seasons;
  @Autowired private CollectorRuntimeService runtimes;
  @Autowired private CollectionCycleService cycles;
  @Autowired private CollectionResultService results;
  @Autowired private CollectionStore store;

  @Autowired
  private com.blockout.backend.collection.application.service.CollectionControlService controls;

  @Autowired private SportingReadService sporting;
  @Autowired private CloseCollectionSeason closure;
  @Autowired private PlatformTransactionManager transactions;
  private UUID season;

  /** Uses the real role setup and migrations in a suite-owned dynamic-port database. */
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
  @DisplayName(
      "An authorized request remains pending under actual maintenance and repeated reads create no work")
  void onePendingRequest() throws Exception {
    // Given: the isolated active season, current account grant and actual F12 maintenance.

    request(0)
        .andExpect(status().isAccepted())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.cycle").doesNotExist());
    CollectionState.Control pending = controls.get(ACCOUNT, CONTROL).control();
    assertThat(pending.requestId()).isNotNull();
    request(pending.revision())
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.pendingRequestId").value(pending.requestId().toString()));
    assertThat(controls.get(ACCOUNT, CONTROL).control().revision()).isEqualTo(pending.revision());
    mvc.perform(get("/administration/collection-controls/{id}", CONTROL).with(operator()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pendingRequestId").value(pending.requestId().toString()));
    // Then
    assertThat(sql.queryForObject("SELECT count(*) FROM collection_cycle", Integer.class)).isZero();
    request(0)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:stale-revision"));
  }

  @Test
  @DisplayName("Pause cancels pending intent and resume restores eligibility without replay")
  void pauseResume() throws Exception {
    // Given: the isolated active season, current account grant and actual F12 maintenance.

    // When / Then
    request(0).andExpect(status().isAccepted());
    long revision = controls.get(ACCOUNT, CONTROL).control().revision();
    activity(revision, false)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pendingRequestId").isEmpty());
    CollectionState.Control paused = controls.get(ACCOUNT, CONTROL).control();
    request(paused.revision()).andExpect(status().isConflict());
    activity(paused.revision(), false)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revision").value(paused.revision()));
    activity(paused.revision(), true)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pendingRequestId").isEmpty());
    // Then
    assertThat(sql.queryForObject("SELECT count(*) FROM collection_cycle", Integer.class)).isZero();
  }

  @Test
  @DisplayName(
      "Running work is returned once but pausing refuses the duplicate and lets admitted work finish")
  void drainsRunning() throws Exception {
    // Given: the isolated active season, current account grant and actual F12 maintenance.

    // When
    cycles.admit(new CollectionState.StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));
    long revision = controls.get(ACCOUNT, CONTROL).control().revision();
    request(revision)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.cycle.id").value(CYCLE.toString()));
    activity(revision, false).andExpect(status().isOk());
    request(controls.get(ACCOUNT, CONTROL).control().revision()).andExpect(status().isConflict());
    results.complete(CYCLE, Instant.now().plusSeconds(1));
    assertThat(cycles.get(CYCLE).state()).isEqualTo(CollectionCycleStateEnum.COMPLETED);
    assertThat(controls.get(ACCOUNT, CONTROL).control().lastSuccessAt()).isNull();
  }

  @Test
  @DisplayName("Grant withdrawal is checked before returning an already pending request")
  void currentGrantBeforeDuplicate() throws Exception {
    // Given: the isolated active season, current account grant and actual F12 maintenance.

    // When / Then
    request(0).andExpect(status().isAccepted());
    CollectionState.Control pending = controls.get(ACCOUNT, CONTROL).control();
    sql.update("DELETE FROM account_permission WHERE account_id=?", ACCOUNT);
    request(pending.revision()).andExpect(status().isForbidden());
    assertThat(
            sql.queryForObject(
                "SELECT request_id FROM collection_control WHERE id=?", UUID.class, CONTROL))
        .isEqualTo(pending.requestId());
  }

  @Test
  @DisplayName(
      "Closure checks exact canonical label and revision before cancelling only this season")
  void exactTerminalClosure() throws Exception {
    // Given: the isolated active season, current account grant and actual F12 maintenance.

    // When / Then
    request(0).andExpect(status().isAccepted());
    close(0, "2026/2027 ").andExpect(status().isUnprocessableContent());
    close(1, "2026/2027").andExpect(status().isConflict());
    assertThat(controls.get(ACCOUNT, CONTROL).control().requestId()).isNotNull();
    // When / Then
    close(0, "2026/2027").andExpect(status().isOk()).andExpect(jsonPath("$.state").value("closed"));
    CollectionState.Control closed = controls.get(ACCOUNT, CONTROL).control();
    assertThat(closed.requestId()).isNull();
    assertThat(store.source(SOURCE).orElseThrow().locked()).isTrue();
    activity(closed.revision(), true).andExpect(status().isConflict());
    request(closed.revision()).andExpect(status().isConflict());
    close(1, "2026/2027").andExpect(status().isConflict());
    mvc.perform(get("/administration/collection-controls").with(operator()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items.length()").value(2));
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
    // Given: the isolated active season, current account grant and actual F12 maintenance.

    // When
    cycles.admit(new CollectionState.StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));
    // When / Then
    close(0, "2026/2027").andExpect(status().isOk());
    results.complete(CYCLE, Instant.now().plusSeconds(1));
    assertThat(cycles.get(CYCLE).state()).isEqualTo(CollectionCycleStateEnum.COMPLETED);
    org.assertj.core.api.Assertions.assertThatThrownBy(
            () ->
                cycles.admit(
                    new CollectionState.StartCycle(
                        UUID.randomUUID(),
                        STARTUP,
                        CONTROL,
                        null,
                        controls.get(ACCOUNT, CONTROL).control().revision(),
                        null)))
        .isInstanceOf(
            com.blockout.backend.collection.application.exception.CollectionConflictException
                .class);
  }

  @Test
  @DisplayName(
      "Seasonal closure preserves another season's pending request and both seasonless controls")
  void independentScopes() throws Exception {
    // Given: the isolated active season, current account grant and actual F12 maintenance.

    UUID otherSeason = seasons.getOrCreate(2027).id();
    UUID otherControl = UUID.fromString("00000000-0000-4000-8000-000000000194");
    UUID otherRequest = UUID.fromString("00000000-0000-4000-8000-000000000195");
    sql.update(
        "INSERT INTO collection_control(id, season_id, family, enabled, request_id, requested_mode) VALUES (?, ?, 'LNV', true, ?, 'MANUAL')",
        otherControl,
        otherSeason,
        otherRequest);
    // When / Then
    close(0, "2026/2027").andExpect(status().isOk());
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
    // Given: the isolated active season, current account grant and actual F12 maintenance.

    // When / Then
    request(0).andExpect(status().isAccepted());
    sql.update("UPDATE collection_control SET revision=9007199254740991 WHERE id=?", CONTROL);
    // When / Then
    close(0, "2026/2027").andExpect(status().isConflict());
    assertThat(seasons.collectionState(season).collectionRevision()).isZero();
    assertThat(controls.get(ACCOUNT, CONTROL).control().requestId()).isNotNull();
  }

  @Test
  @DisplayName("A revoked grant cannot close history or return an existing running execution")
  void deniesRevokedRunningAndClosure() throws Exception {
    // Given: the isolated active season, current account grant and actual F12 maintenance.

    // When
    cycles.admit(new CollectionState.StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));
    long revision = controls.get(ACCOUNT, CONTROL).control().revision();
    sql.update("DELETE FROM account_permission WHERE account_id=?", ACCOUNT);
    request(revision).andExpect(status().isForbidden());
    // When / Then
    close(0, "2026/2027").andExpect(status().isForbidden());
    assertThat(seasons.collectionState(season).collectionRevision()).isZero();
  }

  @Test
  @DisplayName(
      "An unlaunched provider cannot request or resume while another provider's season is active")
  void refusesUnlaunchedProvider() throws Exception {
    // Given: the isolated active season, current account grant and actual F12 maintenance.

    sql.update("UPDATE collection_source_binding SET launched=false WHERE id=?", SOURCE);
    // When / Then
    request(0).andExpect(status().isConflict());
    sql.update("UPDATE collection_control SET enabled=false WHERE id=?", CONTROL);
    activity(0, true).andExpect(status().isConflict());
    assertThat(controls.get(ACCOUNT, CONTROL).control().requestId()).isNull();
  }

  @Test
  @DisplayName("Closure commits before a waiting admission and leaves no newly admitted cycle")
  void closureWinsAdmissionRace() throws Exception {
    // Given: the isolated active season, current account grant and actual F12 maintenance.

    CountDownLatch held = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    CompletableFuture<Integer> admissionPid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
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
        assertThatThrownBy(() -> admission.get(10, TimeUnit.SECONDS))
            .hasCauseInstanceOf(CollectionConflictException.class);
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
    // Given: the isolated active season, current account grant and actual F12 maintenance.

    CountDownLatch held = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    CompletableFuture<Integer> closurePid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
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
    assertThat(cycles.get(CYCLE).state()).isEqualTo(CollectionCycleStateEnum.COMPLETED);
  }

  /** Holds the transaction for a proven competing SQL lock, with a bounded release on failures. */
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
    // Given: the isolated active season, current account grant and actual F12 maintenance.

    UUID pool = prepareProfessionalMatch();
    Instant start = Instant.parse("2026-10-24T12:00:00Z");
    Instant now = start.plusSeconds(offset);
    // When
    List<AcquisitionReference> details = sporting.acquisitionDetails(pool, now, 0);
    // Then
    assertThat(details).hasSize(1);
    assertThat(details.getFirst().fastWindowEndsAt())
        .isEqualTo(fast ? start.plusSeconds(14400) : null);
    List<AcquisitionReference> pools =
        sporting.acquisitionPools(season, CollectionProviderEnum.LNV, "LNV", false, now, 0);
    assertThat(pools).hasSize(1);
    assertThat(pools.getFirst().fastWindowEndsAt())
        .isEqualTo(fast ? start.plusSeconds(14400) : null);
  }

  @Test
  @DisplayName("Unknown and corrected reliable start times supply no stale fast window")
  void currentReliableTimeOnly() {
    // Given: the isolated active season, current account grant and actual F12 maintenance.

    UUID pool = prepareProfessionalMatch();
    Instant now = Instant.parse("2026-10-24T12:00:00Z");
    // When
    sql.update("UPDATE sporting_match SET reliable_start=NULL WHERE pool_id=?", pool);
    // Then
    assertThat(sporting.acquisitionDetails(pool, now, 0).getFirst().fastWindowEndsAt()).isNull();
    sql.update(
        "UPDATE sporting_match SET reliable_start=? WHERE pool_id=?",
        Timestamp.from(now.plusSeconds(7200)),
        pool);
    assertThat(sporting.acquisitionDetails(pool, now, 0).getFirst().fastWindowEndsAt()).isNull();
    assertThat(
            sporting
                .acquisitionPools(season, CollectionProviderEnum.LNV, "LNV", false, now, 0)
                .getFirst()
                .fastWindowEndsAt())
        .isNull();
  }

  /** Constructs one eligible professional match with final sets; no live provider is contacted. */
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

  /** Sends one explicit manual intent at the revision read by the operator. */
  private ResultActions request(long revision) throws Exception {
    return mvc.perform(
        post("/administration/collection-controls/{id}/requests", CONTROL)
            .with(operator())
            .contentType("application/json")
            .content("{\"revision\":" + revision + "}"));
  }

  /** Replaces desired activity without any provider interaction. */
  private ResultActions activity(long revision, boolean enabled) throws Exception {
    return mvc.perform(
        put("/administration/collection-controls/{id}/activity", CONTROL)
            .with(operator())
            .contentType("application/json")
            .content("{\"revision\":" + revision + ",\"enabled\":" + enabled + "}"));
  }

  /** Sends the exact typed canonical label, without normalization. */
  private ResultActions close(long revision, String confirmation) throws Exception {
    return mvc.perform(
        post("/administration/collection-seasons/{id}/closure", season)
            .with(operator())
            .contentType("application/json")
            .content("{\"revision\":" + revision + ",\"confirmation\":\"" + confirmation + "\"}"));
  }

  /** Supplies the real account principal; SQL owns its current permissions. */
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
