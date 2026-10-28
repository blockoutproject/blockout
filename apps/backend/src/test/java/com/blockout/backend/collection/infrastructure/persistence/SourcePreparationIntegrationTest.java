package com.blockout.backend.collection.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.InvalidSourceException;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.model.CollectionState.SourceValidation;
import com.blockout.backend.collection.application.model.CollectionState.StartCycle;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.collection.application.service.AcceptSourceValidation;
import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.ObserveCollectionSource;
import com.blockout.backend.collection.application.service.PrepareCollectionSources;
import com.blockout.backend.collection.application.service.ReadCollectionConfiguration;
import com.blockout.backend.collection.application.service.ReadCollectionWork;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.generated.mobile.model.CollectionResourceKindEnum;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionResourcePage;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.application.service.ReadCollectionSeasons;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import jakarta.persistence.EntityManagerFactory;
import java.net.URI;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.AopTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real committed preparation transactions with controlled time, interleaving and direct SQL
 * fixtures.
 */
@SpringBootTest
@DisplayName("Source preparation and qualified launch")
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SourcePreparationIntegrationTest {
  @Autowired private PostgreSQLContainer database;
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000166");
  private static final UUID SOURCE = UUID.fromString("00000000-0000-4000-8000-000000000167");
  private static final UUID OTHER = UUID.fromString("00000000-0000-4000-8000-000000000168");
  private static final UUID STARTUP = UUID.fromString("00000000-0000-4000-8000-000000000169");
  private static final UUID CYCLE = UUID.fromString("00000000-0000-4000-8000-000000000170");
  private static final String URL =
      "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=ABCCS";
  private static final Instant NOW = Instant.parse("2026-10-20T09:00:00Z");
  @Autowired private PrepareCollectionSources preparation;
  @Autowired private AcceptSourceValidation sourceValidation;
  @Autowired private ReadCollectionConfiguration configurationReads;

  @Autowired private ObserveCollectionSource discovery;

  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private ReadCollectionSeasons seasonReads;
  @Autowired private RegisterCollectorRuntime runtimes;
  @Autowired private ReadCollectionWork collectionWork;
  @Autowired private AdmitCollectionCycle cycles;

  @Autowired private JdbcTemplate sql;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private EntityManagerFactory entityManagerFactory;
  @MockitoSpyBean private CollectionStore store;
  @MockitoBean private Clock clock;
  private UUID season;

  @Test
  @DisplayName(
      "Current source proposals reuse the season while preserving operator-owned preparation")
  void retainsSourcePreparationOnDiscovery() {
    // Given
    Source before = store.source(SOURCE).orElseThrow();
    long revision = seasonReads.collectionState(season).collectionRevision();
    ObserveCollectionSource.Proposal proposal =
        new ObserveCollectionSource.Proposal(
            STARTUP,
            2026,
            CollectionProviderEnum.FFVB,
            "ABCCS",
            URI.create(URL + "&saison=2026/2027"),
            URI.create("https://www.ffvb.org/119-37-1-Championnats-Nationaux"),
            NOW);

    // When
    ObserveCollectionSource.Resolved resolved = discovery.observe(proposal);

    // Then
    assertThat(resolved.seasonId()).isEqualTo(season);
    assertThat(resolved.sourceBindingId()).isEqualTo(SOURCE);
    assertThat(store.source(SOURCE).orElseThrow()).isEqualTo(before);
    assertThat(seasonReads.collectionState(season).collectionRevision()).isEqualTo(revision);
  }

  @Test
  @DisplayName("A repeated proposal loads only its exact source root")
  void looksUpOnlyProposedSource() {
    // Given
    sql.update(
        "INSERT INTO collection_source_binding(id, season_id, provider, organizer_reference, candidate_url, locked, launched, validation_state) VALUES (?, ?, 'FFVB', 'LIRA', ?, FALSE, FALSE, 'UNVALIDATED')",
        OTHER,
        season,
        URL);
    ObserveCollectionSource.Proposal proposal =
        new ObserveCollectionSource.Proposal(
            STARTUP,
            2026,
            CollectionProviderEnum.FFVB,
            "ABCCS",
            URI.create(URL),
            URI.create(URL),
            NOW);
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    boolean enabled = statistics.isStatisticsEnabled();
    statistics.setStatisticsEnabled(true);
    try {
      long before =
          statistics.getEntityStatistics(SourceBindingEntity.class.getName()).getLoadCount();

      // When
      ObserveCollectionSource.Resolved resolved = discovery.observe(proposal);
      long loaded =
          statistics.getEntityStatistics(SourceBindingEntity.class.getName()).getLoadCount()
              - before;

      // Then
      assertThat(resolved.sourceBindingId()).isEqualTo(SOURCE);
      assertThat(loaded).isLessThanOrEqualTo(1);
    } finally {
      statistics.setStatisticsEnabled(enabled);
    }
  }

  @Test
  @DisplayName(
      "Lists pending validation states together while retaining interrupted or missing cycles")
  void readsValidationCyclesTogether() {
    // Given
    UUID missingSource = UUID.fromString("00000000-0000-4000-8000-000000000171");
    UUID interruptedCycle = UUID.fromString("00000000-0000-4000-8000-000000000172");
    UUID missingCycle = UUID.fromString("00000000-0000-4000-8000-000000000173");
    sql.update(
        "UPDATE collection_source_binding SET validation_state = 'PENDING', current_cycle_id = ? WHERE id = ?",
        CYCLE,
        SOURCE);
    sql.update(
        "INSERT INTO collection_cycle(cycle_order, id, incarnation_id, source_binding_id, started_at) VALUES (nextval('collection_cycle_order'), ?, ?, ?, ?)",
        CYCLE,
        STARTUP,
        SOURCE,
        Timestamp.from(NOW));
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    boolean enabled = statistics.isStatisticsEnabled();
    statistics.setStatisticsEnabled(true);
    try {
      long before = statistics.getPrepareStatementCount();
      configurationReads.sources(ACCOUNT, season);
      long singleCycleReads = statistics.getPrepareStatementCount() - before;
      sql.update(
          "INSERT INTO collection_source_binding(id, season_id, provider, organizer_reference, candidate_url, locked, launched, validation_state, current_cycle_id) VALUES (?, ?, 'FFVB', 'LIRA', ?, FALSE, FALSE, 'PENDING', ?), (?, ?, 'FFVB', 'LIRB', ?, FALSE, FALSE, 'PENDING', ?)",
          OTHER,
          season,
          URL,
          interruptedCycle,
          missingSource,
          season,
          URL,
          missingCycle);
      sql.update(
          "INSERT INTO collection_cycle(cycle_order, id, incarnation_id, source_binding_id, started_at) VALUES (nextval('collection_cycle_order'), ?, '00000000-0000-4000-8000-000000000999', ?, ?)",
          interruptedCycle,
          OTHER,
          Timestamp.from(NOW));
      before = statistics.getPrepareStatementCount();

      // When
      List<Source> sources = configurationReads.sources(ACCOUNT, season);
      long listReads = statistics.getPrepareStatementCount() - before;

      // Then
      assertThat(sources).extracting(Source::id).containsExactly(SOURCE, OTHER, missingSource);
      assertThat(sources)
          .extracting(Source::validationState)
          .containsExactly(
              SourceValidationStateEnum.PENDING,
              SourceValidationStateEnum.UNVALIDATED,
              SourceValidationStateEnum.UNVALIDATED);
      assertThat(listReads).isEqualTo(singleCycleReads);
    } finally {
      statistics.setStatisticsEnabled(enabled);
    }
  }

  @Test
  @DisplayName("A superseded incarnation cannot create even a missing season through discovery")
  void fencesNewSeasonProposal() {
    // Given
    UUID obsolete = UUID.fromString("00000000-0000-4000-8000-000000000999");
    ObserveCollectionSource.Proposal proposal =
        new ObserveCollectionSource.Proposal(
            obsolete,
            2027,
            CollectionProviderEnum.FFVB,
            "ABCCS",
            URI.create(URL),
            URI.create(URL),
            NOW);

    // When
    Throwable thrown = catchThrowable(() -> discovery.observe(proposal));

    // Then
    assertThat(thrown).isInstanceOf(CollectionConflictException.class);
    assertThat(
            sql.queryForObject(
                "SELECT count(*) FROM sporting_season WHERE start_year=2027", Integer.class))
        .isZero();
  }

  /**
   * Establishes one unvalidated candidate and one currently authorized operator.
   *
   * @throws Exception if isolated fixture cleanup fails
   */
  @BeforeEach
  void prepareScope() throws Exception {
    when(clock.instant()).thenReturn(NOW);
    try (Connection connection =
            DriverManager.getConnection(
                database.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement cleanup = connection.createStatement()) {
      cleanup.execute("TRUNCATE collection_cycle, sporting_season, account CASCADE");
    }
    sql.update("UPDATE collector_runtime SET incarnation_id = NULL, revision = 0 WHERE id = 1");
    sql.update(
        "INSERT INTO account(id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', 'auth0|preparation', 'Operator_166', 'operator@example.invalid')",
        ACCOUNT);
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'collection.manage')",
        ACCOUNT);
    season = seasons.getOrCreate(2026).id();
    sql.update(
        "INSERT INTO collection_source_binding(id, season_id, provider, organizer_reference, candidate_url, locked, launched, validation_state) VALUES (?, ?, 'FFVB', 'ABCCS', ?, FALSE, FALSE, 'UNVALIDATED')",
        SOURCE,
        season,
        URL);
    runtimes.register(0, STARTUP);
  }

  @Test
  @DisplayName("Changing a candidate clears its accepted validation evidence")
  void clearsPreviousEvidence() {
    // Given
    Source qualified = validate(SourceValidationStateEnum.QUALIFIED, "2026/2027", null);
    long revision = seasonReads.collectionState(season).collectionRevision();

    // When
    Source edited =
        preparation.setCandidate(
            ACCOUNT, SOURCE, qualified.revision(), URI.create(URL + "&saison=2026/2027"));

    // Then
    assertThat(edited.validationState()).isEqualTo(SourceValidationStateEnum.UNVALIDATED);
    assertThat(edited.validatedAt()).isNull();
    assertThat(edited.seasonEvidence()).isNull();
    assertThat(edited.seasonConfirmed()).isFalse();
    assertThat(edited.acceptedUrl()).isNull();
    assertThat(seasonReads.collectionState(season).collectionRevision()).isGreaterThan(revision);
  }

  @Test
  @DisplayName("A late validation cannot qualify an edited candidate")
  void rejectsEditedValidation() {
    // Given
    Source pending = preparation.requestValidation(ACCOUNT, SOURCE, 0);
    cycles.admit(new StartCycle(CYCLE, STARTUP, null, SOURCE, pending.revision(), null));
    preparation.setCandidate(
        ACCOUNT, SOURCE, pending.revision(), URI.create(URL + "&saison=2026/2027"));

    // When
    Throwable thrown =
        catchThrowable(
            () ->
                sourceValidation.submitValidation(
                    SOURCE, result(SourceValidationStateEnum.QUALIFIED, "2026/2027", null)));

    // Then
    assertThat(thrown).isInstanceOf(CollectionConflictException.class);
    assertThat(configurationReads.source(ACCOUNT, SOURCE).validationState())
        .isEqualTo(SourceValidationStateEnum.UNVALIDATED);
  }

  @Test
  @DisplayName("Closing a season refuses an admitted candidate's late result")
  void rejectsClosedValidation() {
    // Given
    Source pending = preparation.requestValidation(ACCOUNT, SOURCE, 0);
    cycles.admit(new StartCycle(CYCLE, STARTUP, null, SOURCE, pending.revision(), null));
    sql.update("UPDATE sporting_season SET collection_state = 'CLOSED' WHERE id = ?", season);

    // When
    Throwable thrown =
        catchThrowable(
            () ->
                sourceValidation.submitValidation(
                    SOURCE, result(SourceValidationStateEnum.QUALIFIED, "2026/2027", null)));

    // Then
    assertThat(thrown).isInstanceOf(CollectionConflictException.class);
    assertThat(collectionWork.get(CYCLE).completedAt()).isNull();
  }

  @Test
  @DisplayName("Qualification and terminal completion commit together and repeat identically")
  void completesValidationAtomically() {
    // Given
    Source qualified = validate(SourceValidationStateEnum.QUALIFIED, "2026/2027", null);

    // When
    Source repeated =
        sourceValidation.submitValidation(
            SOURCE, result(SourceValidationStateEnum.QUALIFIED, "2026/2027", null));

    // Then
    assertThat(repeated).isEqualTo(qualified);
    assertThat(collectionWork.get(CYCLE).state()).isEqualTo(CollectionCycleStateEnum.COMPLETED);
    assertThat(collectionWork.get(CYCLE).completedAt()).isEqualTo(qualified.validatedAt());
    assertThatThrownBy(
            () ->
                sourceValidation.submitValidation(
                    SOURCE, result(SourceValidationStateEnum.INVALID, null, "Wrong organizer")))
        .isInstanceOf(CollectionConflictException.class);
  }

  @Test
  @DisplayName("Human confirmation cannot override the collector's invalid scope result")
  void refusesInvalidConfirmation() {
    // Given
    Source invalid =
        validate(SourceValidationStateEnum.INVALID, null, "Wrong organizer or championship");

    // When
    Throwable thrown =
        catchThrowable(
            () -> preparation.confirmSeason(ACCOUNT, SOURCE, invalid.revision(), "2026/2027"));

    // Then
    assertThat(thrown).isInstanceOf(CollectionConflictException.class);
    assertThat(configurationReads.source(ACCOUNT, SOURCE).validationState())
        .isEqualTo(SourceValidationStateEnum.INVALID);
  }

  @Test
  @DisplayName("Exact confirmation supplies only missing season attribution")
  void confirmsMissingAttribution() {
    // Given
    Source awaiting =
        validate(SourceValidationStateEnum.CONFIRMATION_REQUIRED, null, "Season is not published");
    assertThatThrownBy(
            () -> preparation.confirmSeason(ACCOUNT, SOURCE, awaiting.revision(), " 2026/2027"))
        .isInstanceOf(CollectionConflictException.class);

    // When
    Source confirmed = preparation.confirmSeason(ACCOUNT, SOURCE, awaiting.revision(), "2026/2027");

    // Then
    assertThat(confirmed.validationState()).isEqualTo(SourceValidationStateEnum.QUALIFIED);
    assertThat(confirmed.seasonConfirmed()).isTrue();
    assertThat(confirmed.acceptedUrl()).isNull();
  }

  @Test
  @DisplayName("An obsolete unfinished validation reads as unvalidated without requeuing")
  void projectsInterruptedValidation() {
    // Given
    Source pending = preparation.requestValidation(ACCOUNT, SOURCE, 0);
    cycles.admit(new StartCycle(CYCLE, STARTUP, null, SOURCE, pending.revision(), null));
    UUID replacement = UUID.fromString("00000000-0000-4000-8000-000000000171");
    runtimes.register(collectionWork.current().revision(), replacement);

    // When
    Source projected = configurationReads.source(ACCOUNT, SOURCE);

    // Then
    assertThat(projected.validationState()).isEqualTo(SourceValidationStateEnum.UNVALIDATED);
    assertThat(projected.revision()).isEqualTo(pending.revision());
    assertThat(
            sql.queryForObject(
                "SELECT validation_state FROM collection_source_binding WHERE id = ?",
                String.class,
                SOURCE))
        .isEqualTo("PENDING");
    assertThat(collectionWork.work(replacement).validations()).isEmpty();
    Source renewed = preparation.requestValidation(ACCOUNT, SOURCE, projected.revision());
    assertThat(renewed.revision()).isGreaterThan(pending.revision());
    assertThat(collectionWork.work(replacement).validations()).hasSize(1);
  }

  @Test
  @DisplayName("A source read remains available when renewal removes its loaded cycle")
  void readsSourceAfterCycleReplacement() {
    // Given
    Source pending = preparation.requestValidation(ACCOUNT, SOURCE, 0);
    cycles.admit(new StartCycle(CYCLE, STARTUP, null, SOURCE, pending.revision(), null));
    UUID replacement = UUID.fromString("00000000-0000-4000-8000-000000000171");
    runtimes.register(collectionWork.current().revision(), replacement);
    TransactionTemplate renewal = new TransactionTemplate(transactions);
    renewal.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    // Configure Mockito without entering transaction advice; application actions retain their
    // proxy.
    CollectionStore persistence = AopTestUtils.getUltimateTargetObject(store);
    doAnswer(
            invocation -> {
              Object loaded = invocation.callRealMethod();
              // Commit renewal between the two reads, without timing-dependent threads.
              renewal.executeWithoutResult(
                  status -> preparation.requestValidation(ACCOUNT, SOURCE, pending.revision()));
              return loaded;
            })
        .when(persistence)
        .source(SOURCE);

    // When
    Source projected = configurationReads.source(ACCOUNT, SOURCE);

    // Then
    assertThat(projected.id()).isEqualTo(SOURCE);
    assertThat(projected.validationState()).isEqualTo(SourceValidationStateEnum.UNVALIDATED);
    assertThat(projected.revision()).isEqualTo(pending.revision());
    assertThat(store.cycle(CYCLE)).isEmpty();
    assertThat(collectionWork.work(replacement).validations())
        .singleElement()
        .satisfies(
            candidate -> assertThat(candidate.revision()).isGreaterThan(projected.revision()));
  }

  @Test
  @DisplayName("A repeated current pending request retains one request and its revision")
  void retainsPendingRequest() {
    // Given
    Source pending = preparation.requestValidation(ACCOUNT, SOURCE, 0);

    // When
    Source repeated = preparation.requestValidation(ACCOUNT, SOURCE, pending.revision());

    // Then
    assertThat(repeated).isEqualTo(pending);
    assertThat(collectionWork.work(STARTUP).validations()).hasSize(1);
  }

  @Test
  @DisplayName("Launch freezes the qualified URL without requiring or creating mappings")
  void launchesQualifiedSource() {
    // Given
    validate(SourceValidationStateEnum.QUALIFIED, "2026/2027", null);

    // When
    preparation.launch(
        ACCOUNT, season, seasonReads.collectionState(season).collectionRevision(), Set.of(SOURCE));

    // Then
    Source launched = configurationReads.source(ACCOUNT, SOURCE);
    assertThat(launched.acceptedUrl()).isEqualTo(URL);
    assertThat(launched.locked()).isTrue();
    assertThat(launched.launched()).isTrue();
    assertThat(seasonReads.collectionState(season).collectionState())
        .isEqualTo(CollectionSeasonStateEnum.ACTIVE);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_pool", Integer.class)).isZero();
    assertThat(collectionWork.work(STARTUP).controls())
        .anySatisfy(control -> assertThat(control.seasonId()).isEqualTo(season));
  }

  @Test
  @DisplayName("One unqualified selection rolls back the entire launch")
  void refusesPartialSelection() {
    // Given
    validate(SourceValidationStateEnum.QUALIFIED, "2026/2027", null);
    sql.update(
        "INSERT INTO collection_source_binding(id, season_id, provider, organizer_reference, candidate_url, locked, launched, validation_state) VALUES (?, ?, 'FFVB', 'LIRA', ?, FALSE, FALSE, 'UNVALIDATED')",
        OTHER,
        season,
        URL);
    long revision = seasonReads.collectionState(season).collectionRevision();

    // When
    Throwable thrown =
        catchThrowable(() -> preparation.launch(ACCOUNT, season, revision, Set.of(SOURCE, OTHER)));

    // Then
    assertThat(thrown).isInstanceOf(CollectionConflictException.class);
    assertThat(configurationReads.source(ACCOUNT, SOURCE).locked()).isFalse();
    assertThat(seasonReads.collectionState(season).collectionState())
        .isEqualTo(CollectionSeasonStateEnum.PREPARING);
    assertThat(seasonReads.collectionState(season).collectionRevision()).isEqualTo(revision);
  }

  @Test
  @DisplayName("Pause never unlocks an accepted source while new roots remain preparable")
  void preservesLocksInActiveSeason() {
    // Given
    validate(SourceValidationStateEnum.QUALIFIED, "2026/2027", null);
    preparation.launch(
        ACCOUNT, season, seasonReads.collectionState(season).collectionRevision(), Set.of(SOURCE));
    sql.update("UPDATE collection_control SET enabled = FALSE WHERE season_id = ?", season);
    sql.update(
        "INSERT INTO collection_source_binding(id, season_id, provider, organizer_reference, candidate_url, locked, launched, validation_state) VALUES (?, ?, 'FFVB', 'LIRA', ?, FALSE, FALSE, 'UNVALIDATED')",
        OTHER,
        season,
        URL);

    Source locked = configurationReads.source(ACCOUNT, SOURCE);

    // When
    Throwable editFailure =
        catchThrowable(
            () ->
                preparation.setCandidate(
                    ACCOUNT, SOURCE, locked.revision(), URI.create(URL + "&saison=2027/2028")));
    Source pending = preparation.requestValidation(ACCOUNT, OTHER, 0);

    // Then
    assertThat(editFailure).isInstanceOf(CollectionConflictException.class);
    assertThat(pending.validationState()).isEqualTo(SourceValidationStateEnum.PENDING);
    assertThat(configurationReads.source(ACCOUNT, SOURCE).acceptedUrl()).isEqualTo(URL);
  }

  @ParameterizedTest
  @ValueSource(strings = {"sporting-classification.manage", "stream-links.moderate"})
  @DisplayName("Other management grants do not authorize source changes")
  void requiresCurrentCollectionGrant(String permission) {
    // Given
    sql.update("DELETE FROM account_permission WHERE account_id = ?", ACCOUNT);
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, ?)",
        ACCOUNT,
        permission);

    // When
    Throwable thrown = catchThrowable(() -> preparation.requestValidation(ACCOUNT, SOURCE, 0));

    // Then
    assertThat(thrown).isInstanceOf(AccessDeniedException.class);
    assertThat(
            sql.queryForObject(
                "SELECT validation_state FROM collection_source_binding WHERE id = ?",
                String.class,
                SOURCE))
        .isEqualTo("UNVALIDATED");
  }

  @Test
  @DisplayName(
      "Manual creation stores an unqualified candidate instead of a second organizer registry")
  void createsUnqualifiedCandidate() {
    // Given
    URI candidate = URI.create(URL);

    // When
    Source created =
        preparation.create(ACCOUNT, season, 0, CollectionProviderEnum.FFVB, "LIRA", candidate);

    // Then
    assertThat(created.validationState()).isEqualTo(SourceValidationStateEnum.UNVALIDATED);
    assertThat(created.acceptedUrl()).isNull();
    assertThat(created.locked()).isFalse();
    assertThat(seasonReads.collectionState(season).collectionRevision()).isGreaterThan(0);
  }

  @Test
  @DisplayName("An existing source root cannot be replaced by creation")
  void refusesDuplicateBinding() {
    // Given
    URI replacement = URI.create(URL + "&saison=2027/2028");

    // When
    Throwable thrown =
        catchThrowable(
            () ->
                preparation.create(
                    ACCOUNT, season, 0, CollectionProviderEnum.FFVB, "ABCCS", replacement));

    // Then
    assertThat(thrown).isInstanceOf(CollectionConflictException.class);
    assertThat(configurationReads.sources(ACCOUNT, season)).hasSize(1);
    assertThat(configurationReads.source(ACCOUNT, SOURCE).candidateUrl()).isEqualTo(URL);
    assertThat(seasonReads.collectionState(season).collectionRevision()).isZero();
  }

  @Test
  @DisplayName("A source change invalidates an older whole-season launch decision")
  void refusesStaleSeasonSelection() {
    // Given
    validate(SourceValidationStateEnum.QUALIFIED, "2026/2027", null);
    long revision = seasonReads.collectionState(season).collectionRevision();
    preparation.create(
        ACCOUNT, season, revision, CollectionProviderEnum.FFVB, "LIRA", URI.create(URL));

    // When
    Throwable thrown =
        catchThrowable(() -> preparation.launch(ACCOUNT, season, revision, Set.of(SOURCE)));

    // Then
    assertThat(thrown)
        .isInstanceOfSatisfying(
            CollectionConflictException.class,
            failure -> assertThat(failure.getType()).isEqualTo("stale-revision"));
    assertThat(configurationReads.source(ACCOUNT, SOURCE).launched()).isFalse();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "https://user:secret@www.ffvb.org/source",
        "file:///etc/passwd",
        "/relative/source"
      })
  @DisplayName("Candidate creation refuses credentials and non-HTTP addresses")
  void refusesUnusableCandidate(String url) {
    // Given
    URI candidate = URI.create(url);

    // When
    Throwable thrown =
        catchThrowable(
            () ->
                preparation.create(
                    ACCOUNT, season, 0, CollectionProviderEnum.FFVB, "LIRA", candidate));

    // Then
    assertThat(thrown).isInstanceOf(InvalidSourceException.class);
    assertThat(configurationReads.sources(ACCOUNT, season)).hasSize(1);
  }

  @Test
  @DisplayName(
      "Preparing a later season cannot replace accepted references or reopen closed history")
  void preservesOlderSeason() {
    // Given
    validate(SourceValidationStateEnum.QUALIFIED, "2026/2027", null);
    preparation.launch(
        ACCOUNT, season, seasonReads.collectionState(season).collectionRevision(), Set.of(SOURCE));
    sql.update("UPDATE sporting_season SET collection_state = 'CLOSED' WHERE id = ?", season);
    UUID nextSeason = seasons.getOrCreate(2027).id();

    // When
    preparation.create(
        ACCOUNT,
        nextSeason,
        0,
        CollectionProviderEnum.FFVB,
        "ABCCS",
        URI.create(URL + "&saison=2027/2028"));

    // Then
    assertThat(configurationReads.source(ACCOUNT, SOURCE).acceptedUrl()).isEqualTo(URL);
    assertThat(seasons.getOrCreate(2026).id()).isEqualTo(season);
    assertThat(seasonReads.collectionState(season).collectionState())
        .isEqualTo(CollectionSeasonStateEnum.CLOSED);
    assertThat(seasonReads.collectionState(nextSeason).collectionState())
        .isEqualTo(CollectionSeasonStateEnum.PREPARING);
    assertThatThrownBy(
            () ->
                preparation.create(
                    ACCOUNT,
                    season,
                    seasonReads.collectionState(season).collectionRevision(),
                    CollectionProviderEnum.FFVB,
                    "LIRA",
                    URI.create(URL)))
        .isInstanceOf(CollectionConflictException.class);
  }

  @Test
  @DisplayName("Initial import freezes the candidate and permits a later unchanged periodic launch")
  void launchesInitialImportReference() {
    // Given
    validate(SourceValidationStateEnum.QUALIFIED, "2026/2027", null);
    UUID control = UUID.fromString("00000000-0000-4000-8000-000000000172");
    UUID request = UUID.fromString("00000000-0000-4000-8000-000000000173");
    UUID initialCycle = UUID.fromString("00000000-0000-4000-8000-000000000174");
    sql.update(
        "INSERT INTO collection_control(id, season_id, family, enabled, request_id, requested_mode) VALUES (?, ?, 'FFVB', FALSE, ?, 'INITIAL_IMPORT')",
        control,
        season,
        request);
    sql.update(
        "INSERT INTO collection_request_source(control_id, source_binding_id) VALUES (?, ?)",
        control,
        SOURCE);
    cycles.admit(new StartCycle(initialCycle, STARTUP, control, null, 0, request));
    Source imported = configurationReads.source(ACCOUNT, SOURCE);
    assertThat(imported.locked()).isTrue();
    assertThat(imported.launched()).isFalse();
    assertThat(imported.acceptedUrl()).isEqualTo(URL);
    assertThat(seasonReads.collectionState(season).collectionState())
        .isEqualTo(CollectionSeasonStateEnum.PREPARING);

    // When
    preparation.launch(
        ACCOUNT, season, seasonReads.collectionState(season).collectionRevision(), Set.of(SOURCE));

    // Then
    assertThat(configurationReads.source(ACCOUNT, SOURCE).acceptedUrl())
        .isEqualTo(imported.acceptedUrl());
    assertThat(configurationReads.source(ACCOUNT, SOURCE).launched()).isTrue();
    assertThat(
            sql.queryForObject(
                "SELECT enabled FROM collection_control WHERE id = ?", Boolean.class, control))
        .isFalse();
    assertThat(collectionWork.targets(initialCycle, 0, 50).items())
        .singleElement()
        .satisfies(target -> assertThat(target.target().url()).isEqualTo(URL));
  }

  @Test
  @DisplayName("Direct child reads page unmapped pools and refuse a pack from another source")
  void scopesDiscoveredChildren() {
    // Given
    UUID pack = UUID.fromString("00000000-0000-4000-8000-000000000175");
    UUID pool = UUID.fromString("00000000-0000-4000-8000-000000000176");
    UUID foreignPack = UUID.fromString("00000000-0000-4000-8000-000000000177");
    sql.update(
        "INSERT INTO sporting_pack(id, season_id, provider, organizer_reference, reference) VALUES (?, ?, 'FFVB', 'ABCCS', 'National'), (?, ?, 'FFVB', 'LIRA', 'Regional')",
        pack,
        season,
        foreignPack,
        season);
    sql.update(
        "INSERT INTO sporting_pool(id, season_id, pack_id, provider, organizer_reference, competition_reference, reference, source_name) VALUES (?, ?, ?, 'FFVB', 'ABCCS', 'National', 'A', 'Alpha'), (?, ?, ?, 'FFVB', 'ABCCS', 'National', 'B', 'Beta')",
        pool,
        season,
        pack,
        OTHER,
        season,
        pack);

    // When
    CollectionResourcePage children = configurationReads.children(ACCOUNT, SOURCE, pack, 0, 1);

    // Then
    assertThat(children.hasNext()).isTrue();
    assertThat(children.items())
        .singleElement()
        .satisfies(
            child -> {
              assertThat(child.id()).isEqualTo(pool);
              assertThat(child.label()).isEqualTo("Alpha");
              assertThat(child.kind()).isEqualTo(CollectionResourceKindEnum.POOL);
              assertThat(child.parentId()).isEqualTo(pack);
            });
    assertThat(configurationReads.children(ACCOUNT, SOURCE, null, 0, 50).items())
        .singleElement()
        .satisfies(child -> assertThat(child.id()).isEqualTo(pack));
    assertThatThrownBy(() -> configurationReads.children(ACCOUNT, SOURCE, foreignPack, 0, 50))
        .isInstanceOf(SportingResourceNotFoundException.class);
  }

  /**
   * Runs the real explicit validation request, admission and completion for this fixture.
   *
   * @param state collector's terminal qualification
   * @param evidence attributable season evidence, when available
   * @param reason safe explanatory reason, when needed
   * @return accepted current source
   */
  private Source validate(SourceValidationStateEnum state, String evidence, String reason) {
    Source pending = preparation.requestValidation(ACCOUNT, SOURCE, 0);
    cycles.admit(new StartCycle(CYCLE, STARTUP, null, SOURCE, pending.revision(), null));
    return sourceValidation.submitValidation(SOURCE, result(state, evidence, reason));
  }

  /**
   * Creates terminal evidence for the explicitly admitted fixture cycle.
   *
   * @param state terminal qualification
   * @param evidence optional season evidence
   * @param reason optional safe explanation
   * @return immutable evidence with a deterministic completion instant
   */
  private SourceValidation result(SourceValidationStateEnum state, String evidence, String reason) {
    return new SourceValidation(CYCLE, state, NOW.plusSeconds(1), evidence, reason, null);
  }
}
