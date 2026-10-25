package com.blockout.backend.sporting.application.service;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.CONTROL;
import static com.blockout.backend.sporting.support.SportingIngestionFixture.DIVISION;
import static com.blockout.backend.sporting.support.SportingIngestionFixture.SOURCE;
import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.ReadCollectionWork;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.CatalogObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.net.URI;
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
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real admitted F01 cycles and committed F02 transactions against the migrated PostgreSQL schema.
 */
@Import({PostgresTestConfiguration.class, SportingIdentityFixture.class})
@SpringBootTest
@DisplayName("Contextual catalog and independently committed calendars")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class CalendarAcceptanceIntegrationTest {
  @Autowired private PostgreSQLContainer database;
  private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-10-19T12:00:00Z");
  @Autowired private JdbcTemplate sql;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private AdmitCollectionCycle cycles;
  @Autowired private RegisterCollectorRuntime runtimes;
  @Autowired private ReadCollectionWork collectionWork;
  @Autowired private AcceptCalendar calendars;
  @Autowired private ValidateSportingImage imageContent;
  @Autowired private AcceptMatchObservation matches;
  @Autowired private AcceptCatalog catalogs;
  private CollectionState.Cycle cycle;
  private UUID pool;
  private UUID season;

  /**
   * Creates real qualified source/classification state, then admits through the production owner.
   */
  @BeforeEach
  void admit() throws Exception {
    SportingIngestionFixture.reset(database);
    SportingIngestionFixture.Scope scope =
        SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes);
    season = scope.season();
    pool = scope.pool();
    cycle = scope.cycle();
  }

  @Test
  @DisplayName("Refuses image decoding while a database transaction is active")
  void refusesImageDecodingInTransaction() {
    // Given
    byte[] undecodable = new byte[] {1, 2, 3};
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable validate =
        () -> transaction.executeWithoutResult(status -> imageContent.validate(undecodable));

    // Then
    assertThatThrownBy(validate)
        .isInstanceOf(org.springframework.transaction.IllegalTransactionStateException.class);
  }

  @Test
  @DisplayName("Refuses an ambient transaction before admitting any calendar work")
  void refusesAmbientTransaction() {
    // Given
    CalendarObservation observation =
        calendar(1, List.of(candidate("AMBIENT", "Home", LocalDate.of(2026, 10, 1))));
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable accept =
        () -> transaction.executeWithoutResult(status -> calendars.accept(pool, observation));

    // Then
    assertThatThrownBy(accept)
        .isInstanceOf(org.springframework.transaction.IllegalTransactionStateException.class);
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_match WHERE pool_id = ?", Long.class, pool))
        .isZero();
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
    assertThat(matches.finish(pool, context(1), older, java.util.Set.of("M1"), false)).isFalse();
  }

  @Test
  @DisplayName("Rejects a globally unselected pool before creating sporting identities")
  void rejectsGlobalScope() {
    // Given
    UUID unselected = UUID.fromString("00000000-0000-4000-8000-000000000199");
    CalendarObservation observation = calendar(1, List.of(candidate("M1", "Home", null)));

    // When
    Throwable thrown = catchThrowable(() -> calendars.accept(unselected, observation));

    // Then
    assertThat(thrown).isInstanceOf(CollectionConflictException.class);
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
    Boolean originalEligible =
        sql.queryForObject(
            "SELECT catalog_eligible FROM sporting_pool WHERE id=?", Boolean.class, pool);

    // When
    Throwable conflict =
        catchThrowable(
            () ->
                catalogs.accept(
                    SOURCE,
                    new CatalogObservation(
                        context(2),
                        true,
                        List.of(
                            catalogPool("OTHER", "Other"),
                            item,
                            catalogPool("NEW", "Contradiction")))));

    // Then
    assertThat(first.outcomes()).hasSize(2);
    assertThat(first.outcomes().get(0).resourceId())
        .isEqualTo(first.outcomes().get(1).resourceId());
    assertThat(originalEligible).isTrue();
    assertThat(conflict).isInstanceOf(SportingConflictException.class);
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
            new MatchObservation.Context(
                cycle.id(), 1, NOW.toInstant(), NOW.plusDays(20).toInstant()),
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
    long revision = collectionWork.current().revision();
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
            new MatchObservation.Context(
                cycle.id(), 1, NOW.toInstant(), NOW.minusDays(1).toInstant()),
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
            new MatchObservation.Context(cycle.id(), 2, NOW.plusHours(1).toInstant(), null),
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

    // When
    Throwable thrown =
        catchThrowable(
            () ->
                catalogs.accept(
                    SOURCE,
                    new CatalogObservation(
                        context(1), true, List.of(catalogPool("NEW", "New"), wrongPack))));

    // Then
    assertThat(thrown).isInstanceOf(SportingConflictException.class);
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
    runtimes.register(collectionWork.current().revision(), startup);
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
    return new MatchObservation.Context(cycle.id(), ordinal, NOW.toInstant(), null);
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
