package com.blockout.backend.collection.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.CollectionNotFoundException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.CollectionState.Admission;
import com.blockout.backend.collection.application.model.CollectionState.StartCycle;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.collection.application.service.CollectorRuntimeService;
import com.blockout.backend.generated.ingestion.model.CollectionFamilyEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.service.SeasonService;
import com.blockout.backend.sporting.application.service.SportingIdentityService;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import jakarta.persistence.EntityManagerFactory;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.AopTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Real PostgreSQL admission, frozen-target and transaction-fence contracts. */
@SpringBootTest
@Testcontainers
@DisplayName("Collector admission and transaction-held incarnation fence")
class CollectionAdmissionIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final UUID STARTUP = UUID.fromString("00000000-0000-4000-8000-000000000149");
  private static final UUID REPLACEMENT = UUID.fromString("00000000-0000-4000-8000-000000000150");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000151");
  private static final UUID SOURCE = UUID.fromString("00000000-0000-4000-8000-000000000152");
  private static final UUID CYCLE = UUID.fromString("00000000-0000-4000-8000-000000000153");
  private static final Instant NOW = Instant.parse("2026-10-19T10:00:00Z");
  private static final UUID DIVISION = UUID.fromString("00000000-0000-4000-8000-000000000154");
  @MockitoBean private Clock clock;
  @Autowired private SportingIdentityService identities;
  @Autowired private CollectorRuntimeService runtimes;
  @Autowired private CollectionCycleService cycles;
  @Autowired private SeasonService seasons;
  @Autowired private JdbcTemplate sql;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private EntityManagerFactory entityManagerFactory;
  @MockitoSpyBean private CollectionStore store;
  private UUID season;

  /**
   * Applies the real disposable baseline before the application checks its mappings.
   *
   * @param properties isolated application connection settings
   * @throws Exception if the disposable baseline cannot be migrated
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /** Recreates a qualified active source; no provider data or operator endpoint is involved. */
  @BeforeEach
  void prepareScope() {
    Mockito.when(clock.instant()).thenReturn(NOW);
    try (Connection connection =
            DriverManager.getConnection(
                DATABASE.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement cleanup = connection.createStatement()) {
      cleanup.execute(
          "TRUNCATE collection_control, collection_source_binding, collection_cycle, sporting_season, sporting_club, sporting_division CASCADE");
    } catch (SQLException exception) {
      throw new IllegalStateException(exception);
    }
    sql.update("UPDATE collector_runtime SET incarnation_id = NULL, revision = 0 WHERE id = 1");
    season = seasons.getOrCreate(2026).id();
    sql.update("UPDATE sporting_season SET collection_state = 'ACTIVE' WHERE id = ?", season);
    sql.update(
        "INSERT INTO collection_control(id, season_id, family, enabled, revision) VALUES (?, ?, 'FFVB', TRUE, 0)",
        CONTROL,
        season);
    sql.update(
        "INSERT INTO collection_source_binding(id,season_id,provider,organizer_reference,candidate_url,accepted_url,revision,validation_state,locked,launched) VALUES (?,?,'FFVB','ABCCS','https://www.ffvb.org/source','https://www.ffvb.org/source',0,'QUALIFIED',TRUE,TRUE)",
        SOURCE,
        season);
    runtimes.register(0, STARTUP);
  }

  @Test
  @DisplayName("Enforces unique source roots and seasonal controls in PostgreSQL")
  void enforcesUniqueConfiguration() {

    // When / Then
    assertThatThrownBy(
            () ->
                sql.update(
                    "INSERT INTO collection_control(id,season_id,family,enabled) VALUES (?,?,'FFVB',TRUE)",
                    UUID.randomUUID(),
                    season))
        .isInstanceOf(DataIntegrityViolationException.class);
    assertThatThrownBy(
            () ->
                sql.update(
                    "INSERT INTO collection_source_binding(id,season_id,provider,organizer_reference,validation_state,locked,launched) VALUES (?,?,'FFVB','ABCCS','UNVALIDATED',FALSE,FALSE)",
                    UUID.randomUUID(),
                    season))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  @DisplayName("Rejects revision exhaustion without replacing the current incarnation")
  void rejectsRevisionExhaustion() {
    // Given
    sql.update("UPDATE collector_runtime SET revision = 9007199254740991 WHERE id = 1");

    // When / Then
    assertThatThrownBy(() -> runtimes.register(9_007_199_254_740_991L, REPLACEMENT))
        .isInstanceOf(CollectionConflictException.class);
    assertThat(runtimes.current().incarnationId()).isEqualTo(STARTUP);
  }

  @Test
  @DisplayName("Reading current work does not admit cycles or advance configuration")
  void keepsWorkReadOnly() {
    // Given
    long revision =
        sql.queryForObject(
            "SELECT revision FROM collection_control WHERE id = ?", Long.class, CONTROL);

    // When
    cycles.work(STARTUP);
    cycles.work(STARTUP);

    // Then
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_cycle", Long.class)).isZero();
    assertThat(
            sql.queryForObject(
                "SELECT revision FROM collection_control WHERE id = ?", Long.class, CONTROL))
        .isEqualTo(revision);
  }

  @Test
  @DisplayName("Admits the exact pending candidate without granting sporting-write permission")
  void isolatesCandidatePurpose() {
    // Given
    sql.update(
        "UPDATE collection_source_binding SET locked = FALSE, launched = FALSE, validation_state = 'PENDING' WHERE id = ?",
        SOURCE);

    // When
    Admission admitted = cycles.admit(new StartCycle(CYCLE, STARTUP, null, SOURCE, 0, null));

    // Then
    assertThat(admitted.cycle().mode()).isNull();
    assertThat(admitted.cycle().candidate().candidateUrl())
        .isEqualTo("https://www.ffvb.org/source");
    assertThat(
            sql.queryForObject(
                "SELECT revision FROM collection_source_binding WHERE id = ?", Long.class, SOURCE))
        .isZero();
    assertThatThrownBy(
            () ->
                new TransactionTemplate(transactions)
                    .executeWithoutResult(
                        status ->
                            cycles.requireTarget(
                                CYCLE, SOURCE, CollectionTargetKindEnum.DISCOVERY)))
        .isInstanceOf(CollectionConflictException.class);
  }

  @Test
  @DisplayName("Rejects simultaneous control and candidate purpose before admission")
  void rejectsAmbiguousPurpose() {
    // Given
    StartCycle command = new StartCycle(CYCLE, STARTUP, CONTROL, SOURCE, 0, null);

    // When / Then
    assertThatThrownBy(() -> cycles.admit(command)).isInstanceOf(CollectionConflictException.class);
  }

  @Test
  @DisplayName(
      "A replacement admits a later logical cycle without retaining old context as history")
  void replacesObsoleteCycle() {
    // Given
    Admission first = cycles.admit(new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));
    runtimes.register(1, REPLACEMENT);
    UUID next = UUID.fromString("00000000-0000-4000-8000-000000000155");

    // When
    Admission second = cycles.admit(new StartCycle(next, REPLACEMENT, CONTROL, null, 1, null));

    // Then
    assertThat(second.cycle().cycleOrder()).isGreaterThan(first.cycle().cycleOrder());
    assertThatThrownBy(() -> cycles.get(CYCLE)).isInstanceOf(CollectionNotFoundException.class);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_cycle", Long.class))
        .isEqualTo(1);
  }

  @Test
  @DisplayName(
      "Freezes only current effective classification and pages the snapshot deterministically")
  void freezesEligibleClassification() {
    // Given
    UUID pool = classifiedPool();

    // When
    cycles.admit(new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));
    sql.update(
        "UPDATE sporting_pool SET setting_division_id = NULL, setting_format = NULL, setting_gender = NULL WHERE id = ?",
        pool);

    // Then
    CollectionState.TargetPage first = cycles.targets(CYCLE, 0, 1);
    CollectionState.TargetPage second = cycles.targets(CYCLE, 1, 1);
    assertThat(first.hasNext()).isTrue();
    assertThat(first.items())
        .singleElement()
        .satisfies(
            item -> {
              assertThat(item.target().poolId()).isEqualTo(pool);
              assertThat(item.target().divisionId()).isEqualTo(DIVISION);
            });
    assertThat(second.items())
        .singleElement()
        .satisfies(item -> assertThat(item.target().scopeId()).isEqualTo(SOURCE));
    assertThat(second.hasNext()).isFalse();
  }

  @Test
  @DisplayName("Uses actual attempt age without making an empty admission successful")
  void selectsDueTargets() {
    // Given
    UUID pool = classifiedPool();
    sql.update(
        "INSERT INTO collection_result(control_id,scope_id,stage,phase,last_attempt_at,cycle_order,read_ordinal,outcome) VALUES (?,?,'CALENDAR','ACQUISITION',?,1,1,'SUCCESS')",
        CONTROL,
        pool,
        Timestamp.from(NOW.minusSeconds(60)));
    sql.update(
        "INSERT INTO collection_result(control_id,scope_id,stage,phase,last_attempt_at,cycle_order,read_ordinal,outcome) VALUES (?,?,'DISCOVERY','ACQUISITION',?,1,1,'SUCCESS')",
        CONTROL,
        SOURCE,
        Timestamp.from(NOW.minusSeconds(60)));

    // When
    cycles.admit(new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));

    // Then
    assertThat(cycles.targets(CYCLE, 0, 50).items()).isEmpty();
    assertThat(
            sql.queryForObject(
                "SELECT last_success_at FROM collection_control WHERE id = ?",
                Timestamp.class,
                CONTROL))
        .isNull();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_result", Long.class))
        .isEqualTo(2);
  }

  @Test
  @DisplayName("Reads changed permitted locality when serving a frozen geocoding target")
  void resolvesCurrentLocality() {
    // Given
    UUID club = UUID.fromString("00000000-0000-4000-8000-000000000156");
    sql.update(
        "UPDATE collection_control SET season_id = NULL, family = 'GEOCODING' WHERE id = ?",
        CONTROL);
    sql.update(
        "INSERT INTO sporting_club(id,provider,reference,municipality,postal_code,locality_revision) VALUES (?,'FFVB','000042','Paris','75001',1)",
        club);
    cycles.admit(new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));

    // When
    sql.update(
        "UPDATE sporting_club SET municipality = 'Lyon', postal_code = '69001', locality_revision = 2 WHERE id = ?",
        club);

    // Then
    assertThat(cycles.targets(CYCLE, 0, 50).items())
        .singleElement()
        .satisfies(
            item -> {
              assertThat(item.municipality()).isEqualTo("Lyon");
              assertThat(item.localityRevision()).isEqualTo("2");
            });
    sql.update(
        "UPDATE sporting_club SET municipality_restricted = TRUE, locality_revision = 3 WHERE id = ?",
        club);
    assertThat(cycles.targets(CYCLE, 0, 50).items())
        .singleElement()
        .satisfies(
            item -> {
              assertThat(item.municipality()).isNull();
              assertThat(item.postalCode()).isNull();
              assertThat(item.localityRevision()).isEqualTo("3");
            });
  }

  @Test
  @DisplayName("Serving a larger geocoding page does not add one SQL read per club")
  void readsLocalitiesAsOneBatch() {
    // Given
    List<UUID> clubs =
        List.of(
            UUID.fromString("00000000-0000-4000-8000-000000000160"),
            UUID.fromString("00000000-0000-4000-8000-000000000161"),
            UUID.fromString("00000000-0000-4000-8000-000000000162"));
    sql.update(
        "UPDATE collection_control SET season_id = NULL, family = 'GEOCODING' WHERE id = ?",
        CONTROL);
    for (UUID club : clubs) {
      sql.update(
          "INSERT INTO sporting_club(id,provider,reference,municipality,postal_code,locality_revision) VALUES (?,'FFVB',?,'Paris','75001',1)",
          club,
          club.toString());
    }
    cycles.admit(new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    boolean enabled = statistics.isStatisticsEnabled();
    statistics.setStatisticsEnabled(true);
    try {
      long before = statistics.getPrepareStatementCount();
      cycles.targets(CYCLE, 0, 1);
      long singleTargetReads = statistics.getPrepareStatementCount() - before;
      before = statistics.getPrepareStatementCount();

      // When
      CollectionState.TargetPage page = cycles.targets(CYCLE, 0, 200);
      long pageReads = statistics.getPrepareStatementCount() - before;

      // Then
      assertThat(page.items())
          .extracting(item -> item.target().clubId())
          .containsExactlyElementsOf(clubs);
      assertThat(page.items())
          .allSatisfy(
              item -> {
                assertThat(item.municipality()).isEqualTo("Paris");
                assertThat(item.localityRevision()).isEqualTo("1");
              });
      assertThat(pageReads).isEqualTo(singleTargetReads);
    } finally {
      statistics.setStatisticsEnabled(enabled);
    }
  }

  @Test
  @DisplayName("Inserts new frozen targets without reading each assigned key first")
  void insertsNewTargetsWithoutExistenceReads() {
    // Given
    cycles.admit(new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));
    List<UUID> scopes =
        List.of(
            UUID.fromString("00000000-0000-4000-8000-000000000163"),
            UUID.fromString("00000000-0000-4000-8000-000000000164"),
            UUID.fromString("00000000-0000-4000-8000-000000000165"));
    List<CollectionState.Target> targets =
        scopes.stream()
            .map(
                scope ->
                    CollectionState.Target.builder()
                        .scopeId(scope)
                        .kind(CollectionTargetKindEnum.CALENDAR)
                        .poolId(scope)
                        .url("https://www.ffvb.org/calendar")
                        .build())
            .toList();
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    boolean enabled = statistics.isStatisticsEnabled();
    statistics.setStatisticsEnabled(true);
    try {
      long before = statistics.getPrepareStatementCount();

      // When
      new TransactionTemplate(transactions)
          .executeWithoutResult(status -> store.addTargets(CYCLE, targets));
      long statements = statistics.getPrepareStatementCount() - before;

      // Then
      assertThat(statements).isLessThanOrEqualTo(targets.size());
      assertThat(cycles.targets(CYCLE, 0, 50).items())
          .filteredOn(item -> item.target().kind() == CollectionTargetKindEnum.CALENDAR)
          .extracting(item -> item.target().scopeId())
          .containsExactlyElementsOf(scopes);
    } finally {
      statistics.setStatisticsEnabled(enabled);
    }
  }

  @ParameterizedTest
  @EnumSource(
      value = CollectionFamilyEnum.class,
      names = {"CLUB_SHEETS", "GEOCODING"})
  @DisplayName("Concurrent club creation before the page boundary preserves the admitted selection")
  void preservesClubsAcrossConcurrentCreation(CollectionFamilyEnum family) {
    // Given
    sql.update(
        "UPDATE collection_control SET season_id = NULL, family = ? WHERE id = ?",
        family.name(),
        CONTROL);
    sql.update(
        "INSERT INTO sporting_club(id, provider, reference, municipality) SELECT ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'FFVB', n::text, 'Paris' FROM generate_series(1000, 1200) n");
    List<UUID> initialClubs =
        sql.queryForList("SELECT id FROM sporting_club ORDER BY id", UUID.class);
    AtomicBoolean changed = new AtomicBoolean();
    TransactionTemplate independent = new TransactionTemplate(transactions);
    independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    // Configure Mockito without entering transaction advice; application actions retain their
    // proxy.
    CollectionStore persistence = AopTestUtils.getUltimateTargetObject(store);
    Mockito.doAnswer(
            invocation -> {
              Object result = invocation.callRealMethod();
              if (changed.compareAndSet(false, true))
                independent.executeWithoutResult(
                    status ->
                        sql.update(
                            "INSERT INTO sporting_club(id, provider, reference, municipality) VALUES ('00000000-0000-4000-8000-000000000999', 'FFVB', '999', 'Paris')"));
              return result;
            })
        .when(persistence)
        .addTargets(Mockito.eq(CYCLE), Mockito.anyList());

    // When
    Admission admission = cycles.admit(new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));

    // Then
    assertThat(admission.created()).isTrue();
    assertThat(
            sql.queryForList(
                "SELECT scope_id FROM collection_target WHERE cycle_id = ? ORDER BY scope_id",
                UUID.class,
                CYCLE))
        .containsExactlyElementsOf(initialClubs);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_club", Long.class)).isEqualTo(202);
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName("Concurrent division activity changes preserve every already eligible pool")
  void preservesPoolsAcrossDivisionActivity(boolean activate) {
    // Given
    UUID pack = UUID.fromString("00000000-0000-4000-8000-000000000177");
    UUID changingDivision = UUID.fromString("00000000-0000-4000-8000-000000000176");
    sql.update(
        "INSERT INTO sporting_division(id, name, active, color) VALUES (?, 'Synthetic division', TRUE, '#112233')",
        DIVISION);
    sql.update(
        "INSERT INTO sporting_division(id, name, active, color) VALUES (?, 'Changing division', ?, '#112233')",
        changingDivision,
        !activate);
    sql.update(
        "INSERT INTO sporting_pack(id, season_id, provider, organizer_reference, reference) VALUES (?, ?, 'FFVB', 'ABCCS', 'PACK')",
        pack,
        season);
    sql.update(
        "INSERT INTO sporting_pool(id, season_id, pack_id, provider, organizer_reference, competition_reference, reference, source_name, setting_division_id, setting_format, setting_gender, calendar_url) SELECT ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, ?, ?, 'FFVB', 'ABCCS', 'N2', n::text, 'Synthetic pool', ?, '_6X6', 'MALE', 'https://www.ffvb.org/calendar' FROM generate_series(1000, 1200) n",
        season,
        pack,
        DIVISION);
    sql.update(
        "INSERT INTO sporting_pool(id, season_id, pack_id, provider, organizer_reference, competition_reference, reference, source_name, setting_division_id, setting_format, setting_gender, calendar_url) SELECT '00000000-0000-4000-8000-000000000999', season_id, pack_id, provider, organizer_reference, competition_reference, '999', 'Changing pool', ?, setting_format, setting_gender, calendar_url FROM sporting_pool WHERE id = '00000000-0000-4000-8000-000000001000'",
        changingDivision);
    List<UUID> initialPools =
        sql.queryForList(
            "SELECT p.id FROM sporting_pool p JOIN sporting_division d ON d.id = p.setting_division_id WHERE d.active ORDER BY p.id",
            UUID.class);
    AtomicBoolean changed = new AtomicBoolean();
    TransactionTemplate independent = new TransactionTemplate(transactions);
    independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    // Configure Mockito without entering transaction advice; application actions retain their
    // proxy.
    CollectionStore persistence = AopTestUtils.getUltimateTargetObject(store);
    Mockito.doAnswer(
            invocation -> {
              Object result = invocation.callRealMethod();
              List<CollectionState.Target> targets = invocation.getArgument(1);
              if (!targets.isEmpty()
                  && targets.getFirst().kind() == CollectionTargetKindEnum.CALENDAR
                  && changed.compareAndSet(false, true))
                independent.executeWithoutResult(
                    status ->
                        sql.update(
                            "UPDATE sporting_division SET active = ? WHERE id = ?",
                            activate,
                            changingDivision));
              return result;
            })
        .when(persistence)
        .addTargets(Mockito.eq(CYCLE), Mockito.anyList());

    // When
    Admission admission = cycles.admit(new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));

    // Then
    assertThat(admission.created()).isTrue();
    assertThat(
            sql.queryForList(
                "SELECT scope_id FROM collection_target WHERE cycle_id = ? AND kind = 'CALENDAR' ORDER BY scope_id",
                UUID.class,
                CYCLE))
        .containsExactlyElementsOf(initialPools);
    assertThat(
            sql.queryForObject(
                "SELECT active FROM sporting_division WHERE id = ?",
                Boolean.class,
                changingDivision))
        .isEqualTo(activate);
  }

  @Test
  @DisplayName("Reads pending selections without one SQL query per control")
  void readsControlSelectionsTogether() {
    // Given
    UUID otherControl = UUID.fromString("00000000-0000-4000-8000-000000000166");
    UUID seasonless = UUID.fromString("00000000-0000-4000-8000-000000000167");
    sql.update(
        "INSERT INTO collection_request_source(control_id, source_binding_id) VALUES (?, ?)",
        CONTROL,
        SOURCE);
    sql.update(
        "INSERT INTO collection_request_scope(control_id, scope_id) VALUES (?, ?)",
        CONTROL,
        SOURCE);
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    boolean enabled = statistics.isStatisticsEnabled();
    statistics.setStatisticsEnabled(true);
    try {
      long before = statistics.getPrepareStatementCount();
      transaction.execute(status -> store.controls());
      long singleControlReads = statistics.getPrepareStatementCount() - before;
      sql.update(
          "INSERT INTO collection_control(id, season_id, family, enabled) VALUES (?, ?, 'LNV', FALSE), (?, NULL, 'GEOCODING', FALSE)",
          otherControl,
          season,
          seasonless);
      before = statistics.getPrepareStatementCount();

      // When
      List<CollectionState.Control> controls = transaction.execute(status -> store.controls());
      long listReads = statistics.getPrepareStatementCount() - before;

      // Then
      assertThat(controls)
          .extracting(CollectionState.Control::id)
          .containsExactly(CONTROL, otherControl, seasonless);
      assertThat(controls.getFirst().sourceBindingIds()).containsExactly(SOURCE);
      assertThat(controls.getFirst().scopeIds()).containsExactly(SOURCE);
      assertThat(controls.getLast().sourceBindingIds()).isEmpty();
      assertThat(controls.getLast().scopeIds()).isEmpty();
      assertThat(listReads).isEqualTo(singleControlReads);
    } finally {
      statistics.setStatisticsEnabled(enabled);
    }
  }

  @Test
  @DisplayName("Polling reads current cycle states together without reviving old work")
  void readsWorkCyclesTogether() {
    // Given
    cycles.admit(new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));
    UUID completedControl = UUID.fromString("00000000-0000-4000-8000-000000000168");
    UUID interruptedControl = UUID.fromString("00000000-0000-4000-8000-000000000169");
    UUID completedCycle = UUID.fromString("00000000-0000-4000-8000-000000000170");
    UUID interruptedCycle = UUID.fromString("00000000-0000-4000-8000-000000000171");
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    boolean enabled = statistics.isStatisticsEnabled();
    statistics.setStatisticsEnabled(true);
    try {
      long before = statistics.getPrepareStatementCount();
      cycles.work(STARTUP);
      long singleCycleReads = statistics.getPrepareStatementCount() - before;
      sql.update(
          "INSERT INTO collection_control(id, season_id, family, enabled, current_cycle_id) VALUES (?, ?, 'LNV', FALSE, ?), (?, NULL, 'GEOCODING', FALSE, ?)",
          completedControl,
          season,
          completedCycle,
          interruptedControl,
          interruptedCycle);
      sql.update(
          "INSERT INTO collection_cycle(cycle_order, id, incarnation_id, control_id, started_at, completed_at) VALUES (nextval('collection_cycle_order'), ?, ?, ?, ?, ?), (nextval('collection_cycle_order'), ?, ?, ?, ?, NULL)",
          completedCycle,
          STARTUP,
          completedControl,
          Timestamp.from(NOW),
          Timestamp.from(NOW.plusSeconds(1)),
          interruptedCycle,
          REPLACEMENT,
          interruptedControl,
          Timestamp.from(NOW));
      before = statistics.getPrepareStatementCount();

      // When
      CollectionState.Work work = cycles.work(STARTUP);
      long listReads = statistics.getPrepareStatementCount() - before;

      // Then
      assertThat(work.controls())
          .extracting(CollectionState.ControlWork::id)
          .containsExactly(CONTROL, completedControl, interruptedControl);
      assertThat(work.controls())
          .extracting(CollectionState.ControlWork::runningCycleId)
          .containsExactly(CYCLE, null, null);
      assertThat(listReads).isEqualTo(singleCycleReads);
    } finally {
      statistics.setStatisticsEnabled(enabled);
    }
  }

  @Test
  @DisplayName("Polling reads only its current seasonal configuration in one lookup")
  void readsWorkSeasonsTogether() {
    // Given
    UUID preparing = seasons.getOrCreate(2027).id();
    UUID closed = seasons.getOrCreate(2028).id();
    sql.update("UPDATE sporting_season SET collection_state = 'CLOSED' WHERE id = ?", closed);
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    boolean enabled = statistics.isStatisticsEnabled();
    statistics.setStatisticsEnabled(true);
    try {
      long before = statistics.getPrepareStatementCount();
      cycles.work(STARTUP);
      long singleSeasonReads = statistics.getPrepareStatementCount() - before;
      sql.update(
          "INSERT INTO collection_control(id, season_id, family, enabled) VALUES ('00000000-0000-4000-8000-000000000172', ?, 'FFVB', FALSE), ('00000000-0000-4000-8000-000000000173', ?, 'FFVB', FALSE)",
          preparing,
          closed);
      sql.update(
          "INSERT INTO collection_source_binding(id, season_id, provider, organizer_reference, candidate_url, locked, launched, validation_state) VALUES ('00000000-0000-4000-8000-000000000174', ?, 'FFVB', 'LIRA', 'https://www.ffvb.org/candidate', FALSE, FALSE, 'PENDING'), ('00000000-0000-4000-8000-000000000175', ?, 'FFVB', 'LIRA', 'https://www.ffvb.org/candidate', FALSE, FALSE, 'PENDING')",
          preparing,
          closed);
      before = statistics.getPrepareStatementCount();

      // When
      CollectionState.Work work = cycles.work(STARTUP);
      long listReads = statistics.getPrepareStatementCount() - before;

      // Then
      assertThat(work.controls())
          .extracting(CollectionState.ControlWork::seasonState)
          .containsExactly(
              CollectionSeasonStateEnum.ACTIVE,
              CollectionSeasonStateEnum.PREPARING,
              CollectionSeasonStateEnum.CLOSED);
      assertThat(work.validations())
          .singleElement()
          .satisfies(candidate -> assertThat(candidate.seasonLabel()).isEqualTo("2027/2028"));
      assertThat(listReads).isEqualTo(singleSeasonReads);
    } finally {
      statistics.setStatisticsEnabled(enabled);
    }
  }

  @Test
  @DisplayName("Admission waits for the lifecycle owner and observes its committed closure")
  void serializesWithClosure() throws Exception {
    // Given
    CountDownLatch held = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    CompletableFuture<Integer> admissionPid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?> closure =
          workers.submit(
              () ->
                  transaction.executeWithoutResult(
                      status -> {
                        seasons.lockCollectionState(season);
                        sql.update(
                            "UPDATE sporting_season SET collection_state = 'CLOSED' WHERE id = ?",
                            season);
                        held.countDown();
                        try {
                          assertThat(release.await(10, TimeUnit.SECONDS)).isTrue();
                        } catch (InterruptedException exception) {
                          Thread.currentThread().interrupt();
                          throw new IllegalStateException(exception);
                        }
                      }));
      assertThat(held.await(10, TimeUnit.SECONDS)).isTrue();
      Future<?> admission =
          workers.submit(
              () ->
                  transaction.executeWithoutResult(
                      status -> {
                        admissionPid.complete(
                            sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                        cycles.admit(new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));
                      }));
      try {
        // When
        PostgresTestDatabase.awaitBlocked(sql, admissionPid);
      } finally {
        release.countDown();
      }
      closure.get(10, TimeUnit.SECONDS);
      // Then
      assertThatThrownBy(() -> admission.get(10, TimeUnit.SECONDS))
          .hasCauseInstanceOf(CollectionConflictException.class);
    }
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_cycle", Long.class)).isZero();
  }

  @Test
  @DisplayName("Only one concurrent admission can consume the current control revision")
  void serializesCompetingAdmissions() throws Exception {
    // Given
    CountDownLatch held = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    CompletableFuture<Integer> secondPid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    UUID competitor = UUID.fromString("00000000-0000-4000-8000-000000000157");
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?> first =
          workers.submit(
              () ->
                  transaction.executeWithoutResult(
                      status -> {
                        cycles.admit(new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));
                        held.countDown();
                        try {
                          assertThat(release.await(10, TimeUnit.SECONDS)).isTrue();
                        } catch (InterruptedException exception) {
                          Thread.currentThread().interrupt();
                          throw new IllegalStateException(exception);
                        }
                      }));
      assertThat(held.await(10, TimeUnit.SECONDS)).isTrue();
      Future<?> second =
          workers.submit(
              () ->
                  transaction.executeWithoutResult(
                      status -> {
                        secondPid.complete(
                            sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                        cycles.admit(new StartCycle(competitor, STARTUP, CONTROL, null, 0, null));
                      }));

      // When
      try {
        PostgresTestDatabase.awaitBlocked(sql, secondPid);
      } finally {
        release.countDown();
      }
      first.get(10, TimeUnit.SECONDS);

      // Then
      assertThatThrownBy(() -> second.get(10, TimeUnit.SECONDS))
          .hasCauseInstanceOf(CollectionConflictException.class);
    }
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_cycle", Long.class))
        .isEqualTo(1);
    assertThat(
            sql.queryForObject(
                "SELECT current_cycle_id FROM collection_control WHERE id = ?",
                UUID.class,
                CONTROL))
        .isEqualTo(CYCLE);
  }

  @Test
  @DisplayName("Rejects an edited candidate revision without admitting validation")
  void rejectsStaleCandidate() {
    // Given
    sql.update(
        "UPDATE collection_source_binding SET revision = 1, locked = FALSE, launched = FALSE, validation_state = 'PENDING' WHERE id = ?",
        SOURCE);

    // When / Then
    assertThatThrownBy(() -> cycles.admit(new StartCycle(CYCLE, STARTUP, null, SOURCE, 0, null)))
        .isInstanceOf(CollectionConflictException.class);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_cycle", Long.class)).isZero();
  }

  @Test
  @DisplayName("Refuses control revision overflow before creating a cycle")
  void refusesControlOverflow() {
    // Given
    sql.update("UPDATE collection_control SET revision = 9007199254740991 WHERE id = ?", CONTROL);

    // When / Then
    assertThatThrownBy(
            () ->
                cycles.admit(
                    new StartCycle(CYCLE, STARTUP, CONTROL, null, 9_007_199_254_740_991L, null)))
        .isInstanceOf(CollectionConflictException.class);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_cycle", Long.class)).isZero();
  }

  @Test
  @DisplayName(
      "Initial import consumes only its explicit source selection without enabling periodic work")
  void admitsSelectedInitialImport() {
    // Given
    UUID historicalPool = classifiedPool();
    sql.update("UPDATE sporting_pool SET catalog_eligible = FALSE WHERE id = ?", historicalPool);
    UUID request = UUID.fromString("00000000-0000-4000-8000-000000000158");
    UUID otherSource = UUID.fromString("00000000-0000-4000-8000-000000000159");
    sql.update("UPDATE sporting_season SET collection_state = 'PREPARING' WHERE id = ?", season);
    sql.update(
        "UPDATE collection_source_binding SET locked = FALSE, launched = FALSE WHERE id = ?",
        SOURCE);
    sql.update(
        "INSERT INTO collection_source_binding(id,season_id,provider,organizer_reference,validation_state,locked,launched) VALUES (?,?,'FFVB','OTHER','UNVALIDATED',FALSE,FALSE)",
        otherSource,
        season);
    sql.update(
        "UPDATE collection_control SET enabled = FALSE, request_id = ?, requested_mode = 'INITIAL_IMPORT' WHERE id = ?",
        request,
        CONTROL);
    sql.update(
        "INSERT INTO collection_request_source(control_id,source_binding_id) VALUES (?,?)",
        CONTROL,
        SOURCE);

    // When
    Admission admitted = cycles.admit(new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, request));

    // Then
    assertThat(admitted.cycle().mode()).isEqualTo(CollectionModeEnum.INITIAL_IMPORT);
    assertThat(cycles.targets(CYCLE, 0, 50).items())
        .extracting(item -> item.target().scopeId())
        .containsExactly(historicalPool, SOURCE);
    assertThat(
            sql.queryForObject(
                "SELECT locked FROM collection_source_binding WHERE id = ?", Boolean.class, SOURCE))
        .isTrue();
    assertThat(
            sql.queryForObject(
                "SELECT locked FROM collection_source_binding WHERE id = ?",
                Boolean.class,
                otherSource))
        .isFalse();
    assertThat(
            sql.queryForObject(
                "SELECT enabled FROM collection_control WHERE id = ?", Boolean.class, CONTROL))
        .isFalse();
    assertThat(
            sql.queryForObject(
                "SELECT request_id FROM collection_control WHERE id = ?", UUID.class, CONTROL))
        .isNull();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_request_source", Long.class))
        .isZero();
  }

  @Test
  @DisplayName("Inactive divisions cannot authorize a sporting target even with a qualified URL")
  void excludesInactiveDivision() {
    // Given
    classifiedPool();
    sql.update("UPDATE sporting_division SET active = FALSE WHERE id = ?", DIVISION);

    // When
    cycles.admit(new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));

    // Then
    assertThat(cycles.targets(CYCLE, 0, 50).items())
        .singleElement()
        .satisfies(item -> assertThat(item.target().scopeId()).isEqualTo(SOURCE));
  }

  /**
   * Creates an actual F02 pool, then supplies the current acquisition setting and qualified URL.
   *
   * @return persisted pool eligible for the scenario's acquisition selection
   */
  private UUID classifiedPool() {
    sql.update(
        "INSERT INTO sporting_division(id,name,active,color) VALUES (?,'Synthetic division',TRUE,'#112233')",
        DIVISION);
    PoolKey key = new PoolKey(CollectionProviderEnum.FFVB, season, "ABCCS", "N2", null, null, "P1");
    UUID pool =
        identities
            .establishPool(
                key,
                "PACK",
                "Synthetic pool",
                new SportingClassification(DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    sql.update(
        "UPDATE sporting_pool SET setting_division_id = ?, setting_format = '_6X6', setting_gender = 'MALE', calendar_url = 'https://www.ffvb.org/calendar' WHERE id = ?",
        DIVISION,
        pool);
    return pool;
  }

  @Test
  @DisplayName("Admits one cycle with frozen source context before returning it")
  void admitsCurrentCycle() {
    // Given
    StartCycle command = new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null);

    // When
    Admission admitted = cycles.admit(command);
    sql.update(
        "UPDATE collection_source_binding SET accepted_url = 'https://www.ffvb.org/changed' WHERE id = ?",
        SOURCE);

    // Then
    assertThat(admitted.created()).isTrue();
    assertThat(admitted.cycle().cycleOrder()).isPositive();
    assertThat(cycles.targets(CYCLE, 0, 50).items())
        .singleElement()
        .satisfies(
            target -> {
              assertThat(target.target().scopeId()).isEqualTo(SOURCE);
              assertThat(target.target().url()).isEqualTo("https://www.ffvb.org/source");
            });
    assertThat(cycles.admit(command).created()).isFalse();
    assertThatThrownBy(
            () -> cycles.admit(new StartCycle(UUID.randomUUID(), STARTUP, CONTROL, null, 1, null)))
        .isInstanceOf(CollectionConflictException.class);
  }

  @Test
  @DisplayName("Rejects a stale control revision without creating a cycle")
  void rejectsStaleRevision() {
    // Given
    StartCycle command = new StartCycle(CYCLE, STARTUP, CONTROL, null, 1, null);

    // When / Then
    assertThatThrownBy(() -> cycles.admit(command)).isInstanceOf(CollectionConflictException.class);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_cycle", Long.class)).isZero();
  }

  @Test
  @DisplayName("Refuses new admission after terminal season closure")
  void refusesClosedSeason() {
    // Given
    sql.update("UPDATE sporting_season SET collection_state = 'CLOSED' WHERE id = ?", season);

    // When / Then
    assertThatThrownBy(() -> cycles.admit(new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null)))
        .isInstanceOf(CollectionConflictException.class);
  }

  @Test
  @DisplayName("Repeating the current registration is harmless but stale replacement is refused")
  void preservesRegistrationRevision() {
    // Given
    long revision = runtimes.current().revision();

    // When
    long duplicate = runtimes.register(0, STARTUP).revision();

    // Then
    assertThat(duplicate).isEqualTo(revision);
    assertThatThrownBy(() -> runtimes.register(0, REPLACEMENT))
        .isInstanceOf(CollectionConflictException.class);
  }

  @Test
  @DisplayName("Replacement waits for the fenced domain commit then refuses old writes")
  void holdsFenceThroughDomainCommit() throws Exception {
    // Given
    cycles.admit(new StartCycle(CYCLE, STARTUP, CONTROL, null, 0, null));
    CountDownLatch held = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    CompletableFuture<Integer> replacementPid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?> write =
          workers.submit(
              () ->
                  transaction.executeWithoutResult(
                      status -> {
                        runtimes.requireCurrent(STARTUP);
                        sql.update(
                            "UPDATE sporting_season SET label = 'Committed fact' WHERE id = ?",
                            season);
                        held.countDown();
                        try {
                          assertThat(release.await(10, TimeUnit.SECONDS)).isTrue();
                        } catch (InterruptedException exception) {
                          Thread.currentThread().interrupt();
                          throw new IllegalStateException(exception);
                        }
                      }));
      assertThat(held.await(10, TimeUnit.SECONDS)).isTrue();
      Future<?> replace =
          workers.submit(
              () ->
                  transaction.executeWithoutResult(
                      status -> {
                        replacementPid.complete(
                            sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                        runtimes.register(1, REPLACEMENT);
                      }));
      try {
        // When
        PostgresTestDatabase.awaitBlocked(sql, replacementPid);
        assertThat(replace.isDone()).isFalse();
      } finally {
        release.countDown();
      }
      write.get(10, TimeUnit.SECONDS);
      replace.get(10, TimeUnit.SECONDS);
    }

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT label FROM sporting_season WHERE id = ?", String.class, season))
        .isEqualTo("Committed fact");
    assertThatThrownBy(
            () -> transaction.executeWithoutResult(status -> runtimes.requireCurrent(STARTUP)))
        .isInstanceOf(CollectionConflictException.class);
    assertThat(cycles.get(CYCLE).state().getValue()).isEqualTo("interrupted");
  }
}
