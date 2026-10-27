package com.blockout.backend.collection.application;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.backend.BackendApplication;
import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.InvalidSeasonConfirmationException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.model.CollectionState.Cycle;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.model.InitialCoverage;
import com.blockout.backend.collection.application.model.RecordCollectionResult;
import com.blockout.backend.collection.application.service.AcceptSourceValidation;
import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.ChangeCollectionControls;
import com.blockout.backend.collection.application.service.CloseCollectionSeason;
import com.blockout.backend.collection.application.service.InitialReconstructionService;
import com.blockout.backend.collection.application.service.PrepareCollectionSources;
import com.blockout.backend.collection.application.service.ReadCollectionConfiguration;
import com.blockout.backend.collection.application.service.ReadCollectionWork;
import com.blockout.backend.collection.application.service.RecordCollectionResults;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchResultInternalRequest;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.notifications.application.AfterCommitAnnouncements;
import com.blockout.backend.search.application.ProjectSearch;
import com.blockout.backend.search.application.SearchDocuments;
import com.blockout.backend.search.application.SearchProjectionWriter;
import com.blockout.backend.sporting.api.SportingObservationMapper;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.AcceptCalendar;
import com.blockout.backend.sporting.application.service.AcceptMatchObservation;
import com.blockout.backend.sporting.application.service.ReadCollectionSeasons;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.json.JsonMapper;

/** Synthetic operator passages through real migrated F01/F02/F07 owners; no live source reads. */
@Import({PostgresTestConfiguration.class, SportingIdentityFixture.class})
@SpringBootTest
@RecordApplicationEvents
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Initial reconstruction on migrated PostgreSQL")
class InitialReconstructionIntegrationTest {
  private static final UUID OPERATOR = UUID.fromString("00000000-0000-4000-8000-000000000257");
  private static final UUID STARTUP = UUID.fromString("00000000-0000-4000-8000-000000000258");
  private static final UUID DIVISION = UUID.fromString("00000000-0000-4000-8000-000000000259");
  private static final Instant NOW = Instant.parse("2026-10-27T10:00:00Z");
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private ApplicationEvents events;
  @MockitoBean private Clock clock;
  @Autowired private InitialReconstructionService reconstruction;
  @Autowired private PrepareCollectionSources preparation;
  @Autowired private ReadCollectionSeasons seasonReads;
  @Autowired private RegisterCollectorRuntime runtime;
  @Autowired private AdmitCollectionCycle admission;
  @Autowired private ReadCollectionWork work;
  @Autowired private AcceptSourceValidation validation;
  @Autowired private RecordCollectionResults results;
  @Autowired private CloseCollectionSeason closure;
  @Autowired private ChangeCollectionControls controls;
  @Autowired private ReadCollectionConfiguration configuration;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private AcceptCalendar calendars;
  @Autowired private AcceptMatchObservation matches;
  @Autowired private SportingObservationMapper mapper;
  @Autowired private ReadSportingData sportingReads;

  /**
   * Recreates only the task-owned disposable database and a synthetic explicitly granted account.
   */
  @BeforeEach
  void prepareOperator() throws Exception {
    when(clock.instant()).thenReturn(NOW);
    SportingIngestionFixture.reset(database);
    try (Connection connection =
            DriverManager.getConnection(
                database.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement cleanup = connection.createStatement()) {
      cleanup.execute("TRUNCATE account, collection_control, collection_cycle CASCADE");
    }
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email) VALUES"
            + " (?,'https://identity.example.invalid/','operator','operator','operator@example.invalid')",
        OPERATOR);
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'collection.manage')",
        OPERATOR);
    sql.update(
        "INSERT INTO sporting_division(id,name,active,color) VALUES (?,'Synthetic"
            + " reconstruction',TRUE,'#112233')",
        DIVISION);
    runtime.register(
        sql.queryForObject("SELECT revision FROM collector_runtime WHERE id=1", Long.class),
        STARTUP);
  }

  @ParameterizedTest
  @ValueSource(longs = {2023, 2024, 2025, 2026})
  @DisplayName("Rehearses explicit current and three completed years without periodic launch")
  void rehearsesFourSelectedSeasons(long year) throws Exception {
    // Given
    Source source = qualify(prepareViaCommand(year));
    UUID pool = pool(source, "P1");
    sql.update("UPDATE sporting_pool SET catalog_eligible=FALSE WHERE id=?", pool);
    CollectionSeasonView before = seasonReads.collectionState(source.seasonId());

    // When
    Control pending =
        reconstruction
            .request(
                OPERATOR,
                source.seasonId(),
                before.collectionRevision(),
                Set.of(source.id()),
                Set.of())
            .getFirst();
    Cycle cycle = admit(pending);
    calendars.accept(
        pool,
        new CalendarObservation(
            context(cycle, 1),
            true,
            List.of(candidate("M1", "Synthetic home", LocalDate.of((int) year, 10, 1))),
            List.of(),
            List.of()));
    results.record(
        cycle.id(),
        evidence(
            pool,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.INTEGRATION,
            CollectionOutcomeEnum.SUCCESS,
            2,
            1L));
    results.complete(cycle.id(), NOW.plusSeconds(60));

    // Then
    assertThat(seasonReads.collectionState(source.seasonId()).collectionState())
        .isEqualTo(CollectionSeasonStateEnum.PREPARING);
    assertThat(
            sql.queryForObject(
                "SELECT enabled FROM collection_control WHERE id=?", Boolean.class, pending.id()))
        .isFalse();
    assertThat(
            sql.queryForObject(
                "SELECT launched FROM collection_source_binding WHERE id=?",
                Boolean.class,
                source.id()))
        .isFalse();
    assertThat(
            sql.queryForObject(
                "SELECT locked FROM collection_source_binding WHERE id=?",
                Boolean.class,
                source.id()))
        .isTrue();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_match WHERE pool_id=?", Long.class, pool))
        .isEqualTo(1);
    assertThat(reconstruction.coverage(OPERATOR, source.seasonId(), 0, 200).items())
        .anySatisfy(
            item -> {
              assertThat(item.scopeId()).isEqualTo(pool);
              assertThat(item.phase()).isEqualTo(CollectionPhaseEnum.INTEGRATION);
              assertThat(item.status()).isEqualTo(InitialCoverage.Status.OBTAINED);
            })
        .anySatisfy(
            item -> assertThat(item.status()).isEqualTo(InitialCoverage.Status.UNAVAILABLE));
    assertThatThrownBy(
            () ->
                preparation.setCandidate(
                    OPERATOR, source.id(), 1, URI.create("https://www.ffvb.org/changed")))
        .isInstanceOf(CollectionConflictException.class);
  }

  @Test
  @DisplayName("A rejected historical candidate remains in the requested coverage report")
  void retainsWrongSeasonCoverage() {
    // Given
    Source source =
        reconstruction.prepare(
            OPERATOR,
            2023,
            CollectionProviderEnum.FFVB,
            "ABCCS",
            URI.create(
                "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?saison=2023/2024&codent=ABCCS"));
    Cycle cycle =
        admission
            .admit(
                new CollectionState.StartCycle(
                    UUID.randomUUID(), STARTUP, null, source.id(), source.revision(), null))
            .cycle();

    // When
    validation.submitValidation(
        source.id(),
        new CollectionState.SourceValidation(
            cycle.id(),
            SourceValidationStateEnum.INVALID,
            NOW,
            "2026/2027",
            "Contradictory season evidence"));

    // Then
    assertThatThrownBy(() -> request(source, Set.of()))
        .isInstanceOf(CollectionConflictException.class);
    assertThat(reconstruction.coverage(OPERATOR, source.seasonId(), 0, 200).items())
        .anySatisfy(
            item -> {
              assertThat(item.sourceBindingId()).isEqualTo(source.id());
              assertThat(item.status()).isEqualTo(InitialCoverage.Status.REJECTED);
            });
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Long.class)).isZero();
  }

  @Test
  @DisplayName(
      "Reuses the canonical season and candidate without revalidation of an accepted reference")
  void reusesCanonicalPreparation() {
    // Given
    Source first = qualified(2023, "ABCCS");

    // When
    Source repeated =
        reconstruction.prepare(
            OPERATOR, 2023, CollectionProviderEnum.FFVB, "ABCCS", URI.create(first.candidateUrl()));

    // Then
    assertThat(repeated.id()).isEqualTo(first.id());
    assertThat(repeated.validationState()).isEqualTo(SourceValidationStateEnum.QUALIFIED);
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_season WHERE start_year=2023", Long.class))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("An unclassified discovery passage requires another explicit request")
  void doesNotAutomaticallyFollowDiscovery() {
    // Given
    Source source = qualified(2023, "ABCCS");
    Control pending = request(source, Set.of());

    // When
    Cycle cycle = admit(pending);
    CollectionState.TargetPage targets = work.targets(cycle.id(), 0, 200);
    results.complete(cycle.id(), NOW.plusSeconds(60));

    // Then
    assertThat(targets.items())
        .singleElement()
        .satisfies(
            item -> assertThat(item.target().kind()).isEqualTo(CollectionTargetKindEnum.DISCOVERY));
    assertThat(work.work(STARTUP).controls())
        .noneSatisfy(control -> assertThat(control.requestId()).isNotNull());
  }

  @Test
  @DisplayName("Revoking the current grant refuses a new request without effects")
  void refusesRevokedOperator() {
    // Given
    Source source = qualified(2023, "ABCCS");
    sql.update("DELETE FROM account_permission WHERE account_id=?", OPERATOR);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable request = () -> request(source, Set.of());

    // Then
    assertThatThrownBy(request).isInstanceOf(AccessDeniedException.class);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_request_source", Long.class))
        .isZero();
  }

  @Test
  @DisplayName("A narrower retry replaces only its failed scope and preserves the neighbor gap")
  void retainsUnselectedCoverage() {
    // Given
    Source source = qualified(2023, "ABCCS");
    UUID first = pool(source, "P1");
    UUID second = pool(source, "P2");
    Cycle cycle = admit(request(source, Set.of()));
    results.record(
        cycle.id(),
        evidence(
            first,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            CollectionOutcomeEnum.FAILED,
            1,
            null));
    results.record(
        cycle.id(),
        evidence(
            second,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            CollectionOutcomeEnum.FAILED,
            2,
            null));
    results.complete(cycle.id(), NOW.plusSeconds(60));

    // When
    Control retry = request(source, Set.of(first));
    Cycle retried = admit(retry);
    CollectionState.TargetPage selected = work.targets(retried.id(), 0, 200);
    results.record(
        retried.id(),
        evidence(
            first,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            CollectionOutcomeEnum.SUCCESS,
            1,
            1L));
    results.complete(retried.id(), NOW.plusSeconds(60));

    // Then
    assertThat(selected.items())
        .allSatisfy(item -> assertThat(item.target().scopeId()).isEqualTo(first));
    assertThat(reconstruction.coverage(OPERATOR, source.seasonId(), 0, 200).items())
        .anySatisfy(
            item -> {
              assertThat(item.scopeId()).isEqualTo(second);
              assertThat(item.status()).isEqualTo(InitialCoverage.Status.UNAVAILABLE);
              assertThat(item.cycleOrder()).isEqualTo(cycle.cycleOrder());
            });
  }

  @Test
  @DisplayName(
      "A revoked request rolls back canonical season creation instead of granting bootstrap access")
  void rollsBackUnauthorizedPreparation() {
    // Given
    sql.update("DELETE FROM account_permission WHERE account_id=?", OPERATOR);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable prepare =
        () ->
            reconstruction.prepare(
                OPERATOR,
                2023,
                CollectionProviderEnum.FFVB,
                "ABCCS",
                URI.create("https://www.ffvbbeach.org/archive"));

    // Then
    assertThatThrownBy(prepare).isInstanceOf(AccessDeniedException.class);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_season", Long.class)).isZero();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_source_binding", Long.class))
        .isZero();
  }

  @Test
  @DisplayName("An explicit preparation renews only its interrupted candidate validation")
  void renewsInterruptedValidation() {
    // Given
    Source pending =
        reconstruction.prepare(
            OPERATOR,
            2023,
            CollectionProviderEnum.FFVB,
            "ABCCS",
            URI.create(
                "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?saison=2023/2024&codent=ABCCS"));
    admission.admit(
        new CollectionState.StartCycle(
            UUID.randomUUID(), STARTUP, null, pending.id(), pending.revision(), null));
    runtime.register(
        work.current().revision(), UUID.fromString("00000000-0000-4000-8000-000000000298"));

    // When
    Source renewed =
        reconstruction.prepare(
            OPERATOR,
            2023,
            CollectionProviderEnum.FFVB,
            "ABCCS",
            URI.create(pending.candidateUrl()));

    // Then
    assertThat(renewed.id()).isEqualTo(pending.id());
    assertThat(renewed.validationState()).isEqualTo(SourceValidationStateEnum.PENDING);
    assertThat(renewed.currentCycleId()).isNull();
    assertThat(renewed.revision()).isGreaterThan(pending.revision());
  }

  @Test
  @DisplayName("Interruption stays unavailable and permits only an explicit selected retry")
  void reportsInterruptedCoverage() {
    // Given
    Source source = qualified(2023, "ABCCS");
    Cycle original = admit(request(source, Set.of()));
    UUID replacement = UUID.fromString("00000000-0000-4000-8000-000000000298");

    // When
    runtime.register(work.current().revision(), replacement);
    InitialCoverage.Page report = reconstruction.coverage(OPERATOR, source.seasonId(), 0, 200);

    // Then
    assertThat(report.items())
        .allSatisfy(
            item -> {
              assertThat(item.cycleId()).isEqualTo(original.id());
              assertThat(item.status()).isEqualTo(InitialCoverage.Status.UNAVAILABLE);
            });
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_request_source", Long.class))
        .isZero();
  }

  @Test
  @DisplayName("Ordinary periodic evidence cannot overwrite the undecided initial report")
  void isolatesPeriodicEvidence() {
    // Given
    Source source = qualified(2026, "ABCCS");
    UUID pool = pool(source, "P1");
    Control initial = request(source, Set.of());
    Cycle first = admit(initial);
    results.record(
        first.id(),
        evidence(
            pool,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            CollectionOutcomeEnum.FAILED,
            1,
            null));
    results.complete(first.id(), NOW.plusSeconds(60));
    InitialCoverage.Page before = reconstruction.coverage(OPERATOR, source.seasonId(), 0, 200);
    CollectionSeasonView season = seasonReads.collectionState(source.seasonId());
    preparation.launch(OPERATOR, season.id(), season.collectionRevision(), Set.of(source.id()));
    Control current = configuration.control(OPERATOR, initial.id()).control();
    controls.setActivity(OPERATOR, current.id(), current.revision(), true);
    current = configuration.control(OPERATOR, initial.id()).control();

    when(clock.instant()).thenReturn(NOW.plusSeconds(1800));

    // When
    Cycle periodic =
        admission
            .admit(
                new CollectionState.StartCycle(
                    UUID.randomUUID(), STARTUP, current.id(), null, current.revision(), null))
            .cycle();
    results.record(
        periodic.id(),
        evidence(
            pool,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            CollectionOutcomeEnum.SUCCESS,
            1,
            3L));
    results.complete(periodic.id(), NOW.plusSeconds(1860));

    // Then
    assertThat(reconstruction.coverage(OPERATOR, source.seasonId(), 0, 200)).isEqualTo(before);
  }

  @Test
  @DisplayName("Reading a lost admission acknowledgement cannot widen or reset initial coverage")
  void preservesAdmittedIdentity() {
    // Given
    Source source = qualified(2023, "ABCCS");
    Control pending = request(source, Set.of());
    CollectionState.StartCycle command =
        new CollectionState.StartCycle(
            UUID.randomUUID(),
            STARTUP,
            pending.id(),
            null,
            pending.revision(),
            pending.requestId());
    Cycle original = admission.admit(command).cycle();
    results.record(
        original.id(),
        evidence(
            source.id(),
            CollectionStageEnum.DISCOVERY,
            CollectionPhaseEnum.ACQUISITION,
            CollectionOutcomeEnum.SUCCESS,
            1,
            1L));
    InitialCoverage.Page before = reconstruction.coverage(OPERATOR, source.seasonId(), 0, 200);

    // When
    CollectionState.Admission repeated = admission.admit(command);

    // Then
    assertThat(repeated.created()).isFalse();
    assertThat(repeated.cycle()).isEqualTo(work.get(original.id()));
    assertThat(reconstruction.coverage(OPERATOR, source.seasonId(), 0, 200)).isEqualTo(before);
  }

  @Test
  @DisplayName("A narrowed request cannot become a whole-source request for another provider")
  void refusesUnusedRetryRoots() {
    // Given
    Source ffvb = qualified(2023, "ABCCS");
    Source lnv =
        qualify(
            reconstruction.prepare(
                OPERATOR,
                2023,
                CollectionProviderEnum.LNV,
                "135",
                URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=135")));
    Set<UUID> roots = Set.of(ffvb.id(), lnv.id());
    List<Control> pending =
        reconstruction.request(
            OPERATOR,
            ffvb.seasonId(),
            seasonReads.collectionState(ffvb.seasonId()).collectionRevision(),
            roots,
            Set.of());
    for (Control control : pending) {
      Cycle cycle = admit(control);
      results.complete(cycle.id(), NOW.plusSeconds(60));
    }

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable retry =
        () ->
            reconstruction.request(
                OPERATOR,
                ffvb.seasonId(),
                seasonReads.collectionState(ffvb.seasonId()).collectionRevision(),
                roots,
                Set.of(ffvb.id()));

    // Then
    assertThatThrownBy(retry).isInstanceOf(CollectionConflictException.class);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_request_source", Long.class))
        .isZero();
  }

  @Test
  @DisplayName("An invented narrower scope cannot authorize a retry")
  void refusesUnknownRetryScope() {
    // Given
    Source source = qualified(2023, "ABCCS");
    UUID unknown = UUID.fromString("00000000-0000-4000-8000-000000000299");

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable request =
        () -> request(source, Set.of(unknown));

    // Then
    assertThatThrownBy(request).isInstanceOf(CollectionConflictException.class);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_request_source", Long.class))
        .isZero();
  }

  @Test
  @DisplayName("Initial result acceptance consumes F07 facts without personal announcements")
  void suppressesInitialAnnouncements() {
    // Given
    Source source = qualified(2026, "ABCCS");
    UUID pool = pool(source, "P1");
    Cycle cycle = admit(request(source, Set.of()));
    calendars.accept(
        pool,
        new CalendarObservation(
            context(cycle, 1),
            true,
            List.of(candidate("M1", "Synthetic home", LocalDate.of(2026, 10, 27))),
            List.of(),
            List.of()));
    UUID match =
        sql.queryForObject("SELECT id FROM sporting_match WHERE pool_id=?", UUID.class, pool);
    sql.update(
        "INSERT INTO pool_follow(id,account_id,pool_id) VALUES (?,?,?)",
        UUID.randomUUID(),
        OPERATOR,
        pool);

    // When
    matches.detail(
        new MatchObservation(
            match,
            context(cycle, 2),
            mapper.toFacts(
                new MatchFactsInternalRequest()
                    .result(
                        new MatchResultInternalRequest(ResultStateEnum.FINAL)
                            .homeSets(3)
                            .awaySets(1)))));

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT result_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                match))
        .isTrue();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class)).isZero();
    assertThat(events.stream(AfterCommitAnnouncements.Ready.class)).isEmpty();
  }

  @Test
  @DisplayName("Exact closure drains only admitted work and preserves empty historical input")
  void closesWithoutErasingHistory() {
    // Given
    Source source = qualified(2023, "ABCCS");
    UUID pool = pool(source, "P1");
    Cycle cycle = admit(request(source, Set.of()));
    calendars.accept(
        pool,
        new CalendarObservation(
            context(cycle, 1),
            true,
            List.of(candidate("M1", "Synthetic home", LocalDate.of(2023, 10, 1))),
            List.of(),
            List.of()));
    CollectionSeasonView season = seasonReads.collectionState(source.seasonId());
    assertThatThrownBy(
            () -> closure.close(OPERATOR, season.id(), season.collectionRevision(), " 2023/2024"))
        .isInstanceOf(InvalidSeasonConfirmationException.class);

    // When
    closure.close(OPERATOR, season.id(), season.collectionRevision(), season.label());
    calendars.accept(
        pool, new CalendarObservation(context(cycle, 2), true, List.of(), List.of(), List.of()));
    results.complete(cycle.id(), NOW.plusSeconds(60));

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_match WHERE pool_id=? AND present=TRUE",
                Long.class,
                pool))
        .isEqualTo(1);
    assertThatThrownBy(() -> request(source, Set.of()))
        .isInstanceOf(CollectionConflictException.class);
    assertThatThrownBy(
            () ->
                reconstruction.prepare(
                    OPERATOR,
                    2023,
                    CollectionProviderEnum.FFVB,
                    "ABCCS",
                    URI.create(source.candidateUrl())))
        .isInstanceOf(CollectionConflictException.class);
  }

  @Test
  @DisplayName("The ordinary F04 full rebuild rereads facts accepted by initial reconstruction")
  void handsCurrentFactsToServingRebuild() {
    // Given
    Source source = qualified(2023, "ABCCS");
    UUID pool = pool(source, "P1");
    Cycle cycle = admit(request(source, Set.of()));
    calendars.accept(
        pool,
        new CalendarObservation(
            context(cycle, 1),
            true,
            List.of(candidate("M1", "Synthetic home", LocalDate.of(2023, 10, 1))),
            List.of(),
            List.of()));
    SearchProjectionWriter writer = mock(SearchProjectionWriter.class);
    Map<Kind, String> generation =
        Map.of(Kind.CLUB, "clubs", Kind.TEAM, "teams", Kind.POOL, "pools");
    when(writer.createGeneration()).thenReturn(generation);
    ProjectSearch servingRebuild = new ProjectSearch(sportingReads, writer);
    ArgumentCaptor<List<SearchDocuments>> published = ArgumentCaptor.captor();

    // When
    servingRebuild.rebuild();

    // Then
    verify(writer).write(eq("pools"), published.capture());
    assertThat(published.getValue())
        .anySatisfy(
            document -> {
              assertThat(document.id()).isEqualTo(pool);
              assertThat(document.seasonId()).isEqualTo(source.seasonId());
              assertThat(document.names()).contains("Synthetic P1");
            });
    verify(writer).publish(generation);
  }

  @Test
  @DisplayName(
      "The real non-web profile runs one operator action without an HTTP server or F04 scheduler")
  void runsNonWebEntryPoint() {
    // Given
    Source source = qualified(2023, "ABCCS");

    // When
    try (ConfigurableApplicationContext operator =
        new SpringApplicationBuilder(BackendApplication.class)
            .profiles("initial-reconstruction")
            .web(WebApplicationType.NONE)
            .run(
                "--spring.datasource.url="
                    + database.getJdbcUrl().replace("/postgres", "/blockout"),
                "--spring.datasource.username=blockout_app",
                "--spring.datasource.password=harmless-app",
                "--blockout.reconstruction.operator=" + OPERATOR,
                "--blockout.reconstruction.action=report",
                "--blockout.reconstruction.season-id=" + source.seasonId())) {
      // Then
      assertThat(operator)
          .isNotInstanceOf(
              org.springframework.boot.web.server.context.WebServerApplicationContext.class);
      assertThat(operator.containsBean("searchProjectionScheduler")).isFalse();
      assertThat(operator.containsBean("mobileSecurity")).isFalse();
    }
  }

  /**
   * Executes the documented packaged command against only this suite's disposable database.
   *
   * @param year explicit synthetic sporting start year
   * @return current prepared source read through the existing owner after process exit
   * @throws Exception if the command fails, times out or omits its result
   */
  private Source prepareViaCommand(long year) throws Exception {
    Path log = Path.of("target", "initial-reconstruction-" + year + ".log");
    Process process =
        new ProcessBuilder(
                Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-Xmx256m",
                "-jar",
                Path.of("target", "backend-0.0.0-SNAPSHOT.jar").toAbsolutePath().toString(),
                "--spring.profiles.active=initial-reconstruction",
                "--spring.datasource.url="
                    + database.getJdbcUrl().replace("/postgres", "/blockout"),
                "--spring.datasource.username=blockout_app",
                "--spring.datasource.password=harmless-app",
                "--blockout.security.issuer=https://identity.example.invalid/",
                "--blockout.security.mobile-audience=mobile-test",
                "--blockout.security.mobile-client-id=mobile-test",
                "--blockout.security.ingestion-audience=ingestion-test",
                "--blockout.security.ingestion-client-id=collector-test",
                "--blockout.reconstruction.operator=" + OPERATOR,
                "--blockout.reconstruction.action=prepare",
                "--blockout.reconstruction.start-year=" + year,
                "--blockout.reconstruction.provider=FFVB",
                "--blockout.reconstruction.organizer-reference=ABCCS",
                "--blockout.reconstruction.candidate-url=https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?saison="
                    + year
                    + "/"
                    + (year + 1)
                    + "&codent=ABCCS")
            .redirectErrorStream(true)
            .redirectOutput(log.toFile())
            .start();
    try {
      assertThat(process.waitFor(45, TimeUnit.SECONDS))
          .as("Operator command completes; inspect %s", log)
          .isTrue();
      assertThat(process.exitValue())
          .as("Operator command exits successfully; inspect %s", log)
          .isZero();
      String result =
          Files.readAllLines(log).stream()
              .filter(line -> line.startsWith("{\"id\":"))
              .findFirst()
              .orElseThrow();
      UUID sourceId =
          UUID.fromString(JsonMapper.builder().build().readTree(result).get("id").asText());
      return configuration.source(OPERATOR, sourceId);
    } finally {
      if (process.isAlive()) {
        process.destroyForcibly();
        assertThat(process.waitFor(10, TimeUnit.SECONDS)).isTrue();
      }
    }
  }

  /**
   * Prepares and qualifies only synthetic evidence through the production validation owner.
   *
   * @param year explicit sporting start year
   * @param organizer scenario's official root identity
   * @return qualified candidate in the canonical season
   */
  private Source qualified(long year, String organizer) {
    Source source =
        reconstruction.prepare(
            OPERATOR,
            year,
            CollectionProviderEnum.FFVB,
            organizer,
            URI.create(
                "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?saison="
                    + year
                    + "/"
                    + (year + 1)
                    + "&codent="
                    + organizer));
    return qualify(source);
  }

  /**
   * Supplies explicit synthetic qualification through the real F01 validation transaction.
   *
   * @param source candidate prepared by an owner action, never a provider read
   * @return the accepted qualified source
   */
  private Source qualify(Source source) {
    Cycle cycle =
        admission
            .admit(
                new CollectionState.StartCycle(
                    UUID.randomUUID(), STARTUP, null, source.id(), source.revision(), null))
            .cycle();
    return validation.submitValidation(
        source.id(),
        new CollectionState.SourceValidation(
            cycle.id(),
            SourceValidationStateEnum.QUALIFIED,
            NOW,
            seasonReads.collectionState(source.seasonId()).label(),
            null));
  }

  /**
   * Creates one already classified F02 pool; current-catalog membership is independently
   * controlled.
   *
   * @param source prepared source supplying the canonical season
   * @param reference distinct native pool identity within the fixture
   * @return persisted eligible pool
   */
  private UUID pool(Source source, String reference) {
    UUID pool =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.FFVB,
                    source.seasonId(),
                    "ABCCS",
                    "N2",
                    null,
                    null,
                    reference),
                "PACK",
                "Synthetic " + reference,
                new SportingClassification(DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    sql.update(
        "UPDATE sporting_pool SET setting_division_id=?, setting_format='_6X6',"
            + " setting_gender='MALE',calendar_url='https://www.ffvbbeach.org/calendar' WHERE id=?",
        DIVISION,
        pool);
    return pool;
  }

  /**
   * Explicitly requests this source with its current preparation revision.
   *
   * @param source exact root selected for this request
   * @param scopes empty for the root or an explicit set of failed target identities
   * @return one current pending family request
   */
  private Control request(Source source, Set<UUID> scopes) {
    return reconstruction
        .request(
            OPERATOR,
            source.seasonId(),
            seasonReads.collectionState(source.seasonId()).collectionRevision(),
            Set.of(source.id()),
            scopes)
        .getFirst();
  }

  /**
   * Admits the one previously accepted request with the same original identity.
   *
   * @param control current pending family state
   * @return backend-authorized frozen passage
   */
  private Cycle admit(Control control) {
    return admission
        .admit(
            new CollectionState.StartCycle(
                UUID.randomUUID(),
                STARTUP,
                control.id(),
                null,
                control.revision(),
                control.requestId()))
        .cycle();
  }

  /**
   * Supplies an explicit ordinal and synthetic observation instant within the admitted context.
   *
   * @param cycle original backend-admitted passage
   * @param ordinal explicit read order
   * @return attributable synthetic observation context
   */
  private MatchObservation.Context context(Cycle cycle, long ordinal) {
    return new MatchObservation.Context(cycle.id(), ordinal, NOW, null);
  }

  /**
   * Represents controlled evidence, keeping absent counts distinct from measured zero.
   *
   * @param scope stable admitted resource identity
   * @param stage observed role
   * @param phase acquisition or integration
   * @param outcome actual synthetic outcome
   * @param ordinal explicit read order
   * @param count measured obtained count, or null when unknown
   * @return attributable evidence for the real record transaction
   */
  private RecordCollectionResult evidence(
      UUID scope,
      CollectionStageEnum stage,
      CollectionPhaseEnum phase,
      CollectionOutcomeEnum outcome,
      long ordinal,
      Long count) {
    return new RecordCollectionResult(
        scope, stage, phase, ordinal, NOW, outcome, null, null, count, null);
  }
}
