package com.blockout.backend.sporting.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.collection.application.service.CollectorRuntimeService;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.CatalogObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.net.URI;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
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
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real admitted F01 cycles and committed F02 transactions against the migrated PostgreSQL schema.
 */
@SpringBootTest
@Testcontainers
@DisplayName("Contextual catalog and independently committed calendars")
class CalendarAcceptanceIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000160");
  private static final UUID SOURCE = UUID.fromString("00000000-0000-4000-8000-000000000161");
  private static final UUID DIVISION = UUID.fromString("00000000-0000-4000-8000-000000000162");
  private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-10-19T12:00:00Z");
  @Autowired private JdbcTemplate sql;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private SeasonService seasons;
  @Autowired private SportingIdentityService identities;
  @Autowired private CollectionCycleService cycles;
  @Autowired private CollectorRuntimeService runtimes;
  @Autowired private CalendarAcceptanceService calendars;
  @Autowired private MatchAcceptanceService matches;
  @Autowired private CatalogAcceptanceService catalogs;
  private CollectionState.Cycle cycle;
  private UUID pool;
  private UUID season;

  /**
   * Uses the same maintained database roles and Liquibase initialization as other backend suites.
   *
   * @param properties native application test properties
   * @throws Exception if migration or initialization fails
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /**
   * Creates real qualified source/classification state, then admits through the production owner.
   */
  @BeforeEach
  void admit() throws Exception {
    try (Connection connection =
            DriverManager.getConnection(
                DATABASE.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement fixture = connection.createStatement()) {
      fixture.execute(
          "TRUNCATE sporting_season, sporting_division, sporting_club, collection_source_binding, sporting_catalog CASCADE");
    }
    season = seasons.getOrCreate(2026).id();
    sql.update("UPDATE sporting_season SET collection_state='ACTIVE' WHERE id=?", season);
    sql.update(
        "INSERT INTO sporting_division(id,name,active,color) VALUES (?,'Synthetic',TRUE,'#112233')",
        DIVISION);
    pool =
        identities
            .establishPool(
                new PoolKey(
                    CollectionProviderEnum.FFVB, season, "SYNTHETIC", "COMP", null, null, "POOL"),
                "PACK",
                "Synthetic pool",
                new SportingClassification(DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    sql.update(
        "UPDATE sporting_pool SET calendar_url='https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php', setting_division_id=?, setting_format='_6X6', setting_gender='MALE' WHERE id=?",
        DIVISION,
        pool);
    sql.update(
        "INSERT INTO collection_source_binding(id,season_id,provider,organizer_reference,accepted_url,validation_state,locked,launched) VALUES (?,?,'FFVB','SYNTHETIC','https://www.ffvbbeach.org/ffvbapp/resu/', 'QUALIFIED',FALSE,TRUE)",
        SOURCE,
        season);
    sql.update(
        "INSERT INTO collection_control(id,season_id,family,enabled) VALUES (?,?,'FFVB',TRUE)",
        CONTROL,
        season);
    UUID startup = UUID.randomUUID();
    runtimes.register(runtimes.current().revision(), startup);
    cycle =
        cycles
            .admit(
                new CollectionState.StartCycle(UUID.randomUUID(), startup, CONTROL, null, 0, null))
            .cycle();
  }

  @Test
  @DisplayName("Commits 99 usable matches while the failed match keeps its accepted date")
  void commitsUsefulSubset() {
    // Given
    calendars.accept(
        pool, calendar(1, List.of(candidate("M100", "Home", LocalDate.of(2026, 10, 1)))));
    List<CalendarObservation.Match> proposed = new ArrayList<>();
    for (int i = 1; i < 100; i++)
      proposed.add(candidate("M" + i, "Home", LocalDate.of(2026, 11, 1)));
    proposed.add(candidate("M100", "Unrecognized replacement", LocalDate.of(2026, 12, 1)));

    // When
    ObservationOutcome.Calendar result = calendars.accept(pool, calendar(2, proposed));

    // Then
    assertThat(result.acceptedCount()).isEqualTo(99);
    assertThat(result.rejectedCount()).isEqualTo(1);
    assertThat(result.absenceReconciled()).isFalse();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(100);
    assertThat(date("M100")).isEqualTo(LocalDate.of(2026, 10, 1));
    assertThat(
            sql.queryForObject(
                "SELECT completed_read_ordinal FROM sporting_pool WHERE id=?", Long.class, pool))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("Counts an updated source label as an accepted change")
  void acceptsChangedSourceLabel() {
    // Given
    calendars.accept(pool, calendar(1, List.of(candidate("M1", "Home", null))));

    // When
    ObservationOutcome.Calendar result =
        calendars.accept(pool, calendar(2, List.of(candidate("M1", "HOME", null))));

    // Then
    assertThat(result.acceptedCount()).isEqualTo(1);
    assertThat(
            sql.queryForObject(
                "SELECT source_name FROM sporting_team WHERE id=?",
                String.class,
                result.outcomes().getFirst().homeTeamId()))
        .isEqualTo("HOME");
  }

  @Test
  @DisplayName(
      "Collapses identical references, refuses contradictions and appends acquisition failures")
  void keepsOutcomeOrder() {
    // Given
    CalendarObservation.Match first = candidate("M2", "Home", LocalDate.of(2026, 10, 1));
    CalendarObservation.Match clash = candidate("M1", "Home", LocalDate.of(2026, 10, 1));
    CalendarObservation input =
        new CalendarObservation(
            context(1),
            true,
            List.of(first, first, clash, candidate("M1", "Home", LocalDate.of(2026, 10, 2))),
            List.of(),
            List.of(new CalendarObservation.Failure("row-3", URI.create("urn:test:bad"))));

    // When
    ObservationOutcome.Calendar result = calendars.accept(pool, input);

    // Then
    assertThat(result.outcomes())
        .extracting(ObservationOutcome::sourceReference)
        .containsExactly("M2", "M1", "row-3");
    assertThat(result.acceptedCount()).isEqualTo(1);
    assertThat(result.rejectedCount()).isEqualTo(2);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("A superseding calendar blocks late identity creation and older missing fields")
  void refusesSupersededWork() {
    // Given
    ObservationOrder older = matches.begin(pool, context(1));
    calendars.accept(pool, calendar(2, List.of(candidate("M1", "Home", null))));

    // When
    ObservationOutcome late =
        matches.accept(
            pool, context(1), older, candidate("LATE", "Home", LocalDate.of(2026, 10, 1)));
    ObservationOutcome.Calendar oldFields =
        calendars.accept(
            pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))));

    // Then
    assertThat(late.outcome()).isEqualTo(ObservationOutcomeEnum.STALE);
    assertThat(oldFields.staleCount()).isEqualTo(1);
    assertThat(date("M1")).isNull();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(1);
    assertThat(matches.finish(pool, context(1), older, false)).isFalse();
  }

  @Test
  @DisplayName("Rejects a globally unselected pool before creating sporting identities")
  void rejectsGlobalScope() {

    // When / Then
    assertThatThrownBy(
            () ->
                calendars.accept(
                    UUID.randomUUID(), calendar(1, List.of(candidate("M1", "Home", null)))))
        .isInstanceOf(CollectionConflictException.class);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class)).isZero();
  }

  @Test
  @DisplayName("The first calendar establishes the admitted classification of a discovered pool")
  void classifiesFirstCalendar() {
    // Given
    sql.update(
        "UPDATE sporting_pool SET division_id=NULL, format=NULL, gender=NULL WHERE id=?", pool);

    // When
    ObservationOutcome.Calendar result =
        calendars.accept(pool, calendar(1, List.of(candidate("M1", "Home", null))));

    // Then
    assertThat(result.acceptedCount()).isEqualTo(1);
    assertThat(
            sql.queryForObject(
                "SELECT division_id FROM sporting_pool WHERE id=?", UUID.class, pool))
        .isEqualTo(DIVISION);
  }

  @Test
  @DisplayName("Current classification removal refuses the item without restoring collection")
  void respectsCurrentClassification() {
    // Given
    sql.update(
        "UPDATE sporting_pool SET setting_division_id=NULL, setting_format=NULL, setting_gender=NULL WHERE id=?",
        pool);

    // When
    ObservationOutcome.Calendar result =
        calendars.accept(pool, calendar(1, List.of(candidate("M1", "Home", null))));

    // Then
    assertThat(result.rejectedCount()).isEqualTo(1);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_team", Integer.class)).isZero();
  }

  @Test
  @DisplayName(
      "An incomplete catalog preserves references and a conflicting duplicate rolls back the entire catalog")
  void preservesAtomicCatalog() {
    // Given
    CatalogObservation.Pool item = catalogPool("NEW", "New pool");
    ObservationOutcome.Catalog first =
        catalogs.accept(SOURCE, new CatalogObservation(context(1), false, List.of(item, item)));

    // When / Then
    assertThat(first.outcomes()).hasSize(2);
    assertThat(first.outcomes().get(0).resourceId())
        .isEqualTo(first.outcomes().get(1).resourceId());
    assertThat(
            sql.queryForObject(
                "SELECT catalog_eligible FROM sporting_pool WHERE id=?", Boolean.class, pool))
        .isTrue();
    assertThatThrownBy(
            () ->
                catalogs.accept(
                    SOURCE,
                    new CatalogObservation(
                        context(2),
                        true,
                        List.of(
                            catalogPool("OTHER", "Other"),
                            item,
                            catalogPool("NEW", "Contradiction")))))
        .isInstanceOf(SportingConflictException.class);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_pool", Integer.class))
        .isEqualTo(2);
    assertThat(
            sql.queryForObject(
                "SELECT read_ordinal FROM sporting_catalog WHERE source_id=?", Long.class, SOURCE))
        .isEqualTo(1);
  }

  @Test
  @DisplayName(
      "Qualified empty discovery withdraws only its source-season catalog; old discovery cannot restore it")
  void qualifiesCatalogAbsence() {
    // Given
    catalogs.accept(SOURCE, new CatalogObservation(context(2), true, List.of()));

    // When
    ObservationOutcome.Catalog old =
        catalogs.accept(
            SOURCE, new CatalogObservation(context(1), true, List.of(catalogPool("POOL", "Old"))));

    // Then
    assertThat(old.outcomes().getFirst().outcome()).isEqualTo(ObservationOutcomeEnum.STALE);
    assertThat(
            sql.queryForObject(
                "SELECT catalog_eligible FROM sporting_pool WHERE id=?", Boolean.class, pool))
        .isFalse();
  }

  @Test
  @DisplayName("Provider publication time never overrides logical observation order")
  void ignoresPublicationForOrder() {
    // Given
    calendars.accept(
        pool, calendar(2, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))));
    CalendarObservation old =
        new CalendarObservation(
            new MatchObservation.Context(cycle.id(), 1, NOW, NOW.plusDays(20)),
            true,
            List.of(candidate("M1", "Home", LocalDate.of(2026, 12, 1))),
            List.of(),
            List.of());

    // When
    ObservationOutcome.Calendar result = calendars.accept(pool, old);

    // Then
    assertThat(result.staleCount()).isEqualTo(1);
    assertThat(date("M1")).isEqualTo(LocalDate.of(2026, 10, 1));
  }

  @Test
  @DisplayName("Incarnation replacement waits for the actual match transaction to commit")
  void fencesReplacementThroughCommit() throws Exception {
    // Given
    ObservationOrder order = matches.begin(pool, context(1));
    CountDownLatch held = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    CompletableFuture<Integer> replacementPid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    long revision = runtimes.current().revision();
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?> accepting =
          workers.submit(
              () ->
                  transaction.executeWithoutResult(
                      status -> {
                        matches.accept(
                            pool,
                            context(1),
                            order,
                            candidate("M1", "Home", LocalDate.of(2026, 10, 1)));
                        held.countDown();
                        try {
                          assertThat(release.await(10, TimeUnit.SECONDS)).isTrue();
                        } catch (InterruptedException interrupted) {
                          Thread.currentThread().interrupt();
                          throw new IllegalStateException(interrupted);
                        }
                      }));
      assertThat(held.await(10, TimeUnit.SECONDS)).isTrue();
      Future<?> replacement =
          workers.submit(
              () ->
                  transaction.executeWithoutResult(
                      status -> {
                        replacementPid.complete(
                            sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                        runtimes.register(revision, UUID.randomUUID());
                      }));
      // When
      try {
        PostgresTestDatabase.awaitBlocked(sql, replacementPid);
      } finally {
        release.countDown();
      }
      accepting.get(10, TimeUnit.SECONDS);
      replacement.get(10, TimeUnit.SECONDS);
      // Then
      assertThat(date("M1")).isEqualTo(LocalDate.of(2026, 10, 1));
      assertThatThrownBy(
              () -> matches.accept(pool, context(1), order, candidate("LATE", "Home", null)))
          .isInstanceOf(CollectionConflictException.class);
      assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
          .isEqualTo(1);
    }
  }

  @Test
  @DisplayName("A concurrent older detail cannot overwrite the newer committed observation")
  void preservesNewerConcurrentDetail() throws Exception {
    // Given
    calendars.accept(
        pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))));
    UUID id = sql.queryForObject("SELECT id FROM sporting_match WHERE reference='M1'", UUID.class);
    MatchObservation newer =
        new MatchObservation(
            id, context(3), candidate("M1", "Home", LocalDate.of(2026, 10, 3)).facts());
    MatchObservation older =
        new MatchObservation(
            id, context(2), candidate("M1", "Home", LocalDate.of(2026, 10, 2)).facts());
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    CountDownLatch newerWritten = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    CompletableFuture<Integer> olderPid = new CompletableFuture<>();
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?> accepting =
          workers.submit(
              () ->
                  transaction.executeWithoutResult(
                      status -> {
                        matches.detail(newer);
                        newerWritten.countDown();
                        try {
                          assertThat(release.await(10, TimeUnit.SECONDS)).isTrue();
                        } catch (InterruptedException interrupted) {
                          Thread.currentThread().interrupt();
                          throw new IllegalStateException(interrupted);
                        }
                      }));
      assertThat(newerWritten.await(10, TimeUnit.SECONDS)).isTrue();
      Future<ObservationOutcome> waiting =
          workers.submit(
              () ->
                  transaction.execute(
                      status -> {
                        olderPid.complete(
                            sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                        return matches.detail(older);
                      }));

      // When
      try {
        PostgresTestDatabase.awaitBlocked(sql, olderPid);
      } finally {
        release.countDown();
      }
      accepting.get(10, TimeUnit.SECONDS);
      ObservationOutcome outcome = waiting.get(10, TimeUnit.SECONDS);

      // Then
      assertThat(outcome.outcome()).isEqualTo(ObservationOutcomeEnum.STALE);
      assertThat(date("M1")).isEqualTo(LocalDate.of(2026, 10, 3));
      assertThat(
              sql.queryForObject(
                  "SELECT accepted_read_ordinal FROM sporting_match WHERE id=?", Long.class, id))
          .isEqualTo(3);
    }
  }

  @Test
  @DisplayName("Explicit schedule withdrawal clears the persisted date")
  void withdrawsDate() {
    // Given
    calendars.accept(
        pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))));
    MatchObservation.Facts withdrawn =
        new MatchObservation.Facts(
            JsonNullable.of(null),
            JsonNullable.undefined(),
            null,
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined());
    UUID id = sql.queryForObject("SELECT id FROM sporting_match WHERE reference='M1'", UUID.class);

    // When
    ObservationOutcome outcome = matches.detail(new MatchObservation(id, context(2), withdrawn));

    // Then
    assertThat(outcome.outcome()).isEqualTo(ObservationOutcomeEnum.ACCEPTED);
    assertThat(date("M1")).isNull();
    assertThat(
            sql.queryForObject(
                "SELECT accepted_read_ordinal FROM sporting_match WHERE id=?", Long.class, id))
        .isEqualTo(2);
  }

  @Test
  @DisplayName(
      "Omitted entry references retain their independent publication and observation times")
  void preservesIndependentAttribution() {
    // Given
    CalendarObservation.Match first = candidate("M1", "Home", LocalDate.of(2026, 10, 1));
    URI detailUrl = URI.create("https://www.ffvbbeach.org/ffvbapp/resu/match.php?id=M1");
    calendars.accept(
        pool,
        new CalendarObservation(
            new MatchObservation.Context(cycle.id(), 1, NOW, NOW.minusDays(1)),
            true,
            List.of(
                new CalendarObservation.Match(
                    first.nativeMatchReference(),
                    first.home(),
                    first.away(),
                    first.facts(),
                    detailUrl)),
            List.of(),
            List.of()));

    // When
    calendars.accept(
        pool,
        new CalendarObservation(
            new MatchObservation.Context(cycle.id(), 2, NOW.plusHours(1), null),
            true,
            List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 2))),
            List.of(),
            List.of()));

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT detail_url FROM sporting_match WHERE reference='M1'", String.class))
        .isEqualTo(detailUrl.toString());
    assertThat(
            sql.queryForObject(
                "SELECT reference_observed_at FROM sporting_match WHERE reference='M1'",
                OffsetDateTime.class))
        .isEqualTo(NOW);
    assertThat(
            sql.queryForObject(
                "SELECT reference_published_at FROM sporting_match WHERE reference='M1'",
                OffsetDateTime.class))
        .isEqualTo(NOW.minusDays(1));
    assertThat(
            sql.queryForObject(
                "SELECT schedule_observed_at FROM sporting_match WHERE reference='M1'",
                OffsetDateTime.class))
        .isEqualTo(NOW.plusHours(1));
    assertThat(
            sql.queryForObject(
                "SELECT schedule_published_at FROM sporting_match WHERE reference='M1'",
                OffsetDateTime.class))
        .isNull();
  }

  @Test
  @DisplayName("A current empty calendar completes only when the envelope is qualified complete")
  void distinguishesIncompleteEmpty() {
    // Given
    calendars.accept(
        pool, new CalendarObservation(context(1), false, List.of(), List.of(), List.of()));
    assertThat(
            sql.queryForObject(
                "SELECT completed_read_ordinal FROM sporting_pool WHERE id=?", Long.class, pool))
        .isNull();

    // When
    calendars.accept(pool, calendar(2, List.of()));

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT completed_read_ordinal FROM sporting_pool WHERE id=?", Long.class, pool))
        .isEqualTo(2);
  }

  @Test
  @DisplayName("A late invalid catalog entry rolls back earlier pool creation in the same request")
  void rollsBackCatalogMutation() {
    // Given
    CatalogObservation.Pool wrongPack =
        new CatalogObservation.Pool(
            "OTHER_PACK", "COMP", "POOL", null, null, null, null, "Existing");

    // When / Then
    assertThatThrownBy(
            () ->
                catalogs.accept(
                    SOURCE,
                    new CatalogObservation(
                        context(1), true, List.of(catalogPool("NEW", "New"), wrongPack))))
        .isInstanceOf(SportingConflictException.class);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_pool", Integer.class))
        .isEqualTo(1);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_catalog", Integer.class)).isZero();
  }

  @Test
  @DisplayName("A completed calendar token cannot create another late encounter when replayed")
  void refusesNewIdentityFromCompletedRead() {
    // Given
    calendars.accept(pool, calendar(1, List.of(candidate("M1", "Home", null))));

    // When
    ObservationOutcome.Calendar replay =
        calendars.accept(pool, calendar(1, List.of(candidate("LATE", "Home", null))));

    // Then
    assertThat(replay.staleCount()).isEqualTo(1);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("Wholly empty initial reconstruction cannot finalize retained calendar absence")
  void preservesInitialHistory() {
    // Given
    UUID startup = UUID.randomUUID();
    runtimes.register(runtimes.current().revision(), startup);
    UUID request = UUID.fromString("00000000-0000-4000-8000-000000000163");
    sql.update("UPDATE sporting_season SET collection_state='PREPARING' WHERE id=?", season);
    sql.update(
        "UPDATE collection_control SET enabled=FALSE, request_id=?, requested_mode='INITIAL_IMPORT' WHERE id=?",
        request,
        CONTROL);
    sql.update(
        "INSERT INTO collection_request_source(control_id,source_binding_id) VALUES (?,?)",
        CONTROL,
        SOURCE);
    long revision =
        sql.queryForObject(
            "SELECT revision FROM collection_control WHERE id=?", Long.class, CONTROL);
    cycle =
        cycles
            .admit(
                new CollectionState.StartCycle(
                    UUID.randomUUID(), startup, CONTROL, null, revision, request))
            .cycle();
    // When
    calendars.accept(pool, calendar(1, List.of()));
    // Then
    assertThat(
            sql.queryForObject(
                "SELECT completed_read_ordinal FROM sporting_pool WHERE id=?", Long.class, pool))
        .isNull();
  }

  /**
   * Reads the actually committed schedule without a surrounding test transaction.
   *
   * @param reference synthetic native match reference
   * @return persisted date, possibly null
   */
  private LocalDate date(String reference) {
    return sql.queryForObject(
        "SELECT local_date FROM sporting_match WHERE reference=?", LocalDate.class, reference);
  }

  /**
   * Supplies the original admitted context and a scenario-specific read ordinal.
   *
   * @param ordinal logical pre-read order
   * @return real cycle attribution
   */
  private MatchObservation.Context context(long ordinal) {
    return new MatchObservation.Context(cycle.id(), ordinal, NOW, null);
  }

  /**
   * Builds a complete candidate list; tests state incomplete inputs explicitly.
   *
   * @param ordinal scenario read order
   * @param candidates scenario-owned encounters
   * @return envelope without hidden writes
   */
  private CalendarObservation calendar(long ordinal, List<CalendarObservation.Match> candidates) {
    return new CalendarObservation(context(ordinal), true, candidates, List.of(), List.of());
  }

  /**
   * Supplies identity and optional schedule while leaving other fact groups omitted.
   *
   * @param reference native encounter identity
   * @param home scenario-defining participant label
   * @param date proposed date; null represents omission
   * @return immutable candidate with exact club references
   */
  private CalendarObservation.Match candidate(String reference, String home, LocalDate date) {
    MatchObservation.Facts facts =
        new MatchObservation.Facts(
            date == null ? JsonNullable.undefined() : JsonNullable.of(date),
            JsonNullable.undefined(),
            null,
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined());
    return new CalendarObservation.Match(
        reference,
        new TeamCandidate(null, home, "000160", null),
        new TeamCandidate(null, "Away", "000161", null),
        facts,
        null);
  }

  /**
   * Supplies one qualified native catalog identity without preassigned classification.
   *
   * @param reference native pool reference
   * @param name source label
   * @return contextual discovery row
   */
  private CatalogObservation.Pool catalogPool(String reference, String name) {
    return new CatalogObservation.Pool(
        "PACK",
        "COMP",
        reference,
        null,
        null,
        URI.create("https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php"),
        null,
        name);
  }
}
