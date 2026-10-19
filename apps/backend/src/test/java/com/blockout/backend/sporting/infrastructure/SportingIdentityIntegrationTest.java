package com.blockout.backend.sporting.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doAnswer;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.sporting.application.PoolKey;
import com.blockout.backend.sporting.application.SeasonService;
import com.blockout.backend.sporting.application.SportingClassification;
import com.blockout.backend.sporting.application.SportingIdentityService;
import com.blockout.backend.sporting.application.SportingReadService;
import com.blockout.backend.sporting.application.SportingViews.MatchView;
import com.blockout.backend.sporting.application.SportingViews.PoolView;
import com.blockout.backend.sporting.application.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.SportingViews.TeamView;
import com.blockout.backend.sporting.application.TeamCandidate;
import com.blockout.backend.sporting.application.UnresolvedSportingIdentityException;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutionException;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Exercises committed identity decisions through the real services and migrated PostgreSQL. */
@SpringBootTest
@Testcontainers
@DisplayName("Persistent sporting identities")
class SportingIdentityIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final UUID DIVISION = UUID.fromString("00000000-0000-4000-8000-000000000010");
  @Autowired private SeasonService seasons;
  @Autowired private SportingIdentityService identities;
  @Autowired private SportingReadService reads;
  @Autowired private JdbcTemplate sql;
  @Autowired private PlatformTransactionManager transactions;
  @MockitoSpyBean private JpaSportingStore store;

  /**
   * Migrates explicitly before Hibernate validates the application-role connection.
   *
   * @param properties native test configuration registry
   * @throws Exception if the disposable baseline cannot be created
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /**
   * Clears disposable data as its migration owner, then creates only the required division fixture.
   *
   * @throws Exception if isolated fixture cleanup fails
   */
  @BeforeEach
  void prepareOwners() throws Exception {
    try (java.sql.Connection connection =
            java.sql.DriverManager.getConnection(
                DATABASE.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        java.sql.Statement fixture = connection.createStatement()) {
      fixture.execute("TRUNCATE sporting_season, sporting_club, sporting_division CASCADE");
    }
    sql.update(
        "INSERT INTO sporting_division(id, name, active, color) VALUES (?, 'Synthetic division', true, '#112233')",
        DIVISION);
  }

  @Test
  @DisplayName(
      "Reuses canonical years and cross-season clubs while keeping seasonal teams separate")
  void separatesSeasons() {
    // Given
    SeasonView first = seasons.getOrCreate(2026L);
    SeasonView next = seasons.getOrCreate(2027L);
    PoolView firstPool = pool(first, "A", null, CollectionProviderEnum.FFVB);
    PoolView nextPool = pool(next, "A", null, CollectionProviderEnum.FFVB);

    // When
    MatchView firstMatch =
        identities.identifyMatch(
            firstPool.id(), "M1", ffvb("Synthetic home", "0001"), ffvb("Synthetic away", "0002"));
    MatchView nextMatch =
        identities.identifyMatch(
            nextPool.id(), "M1", ffvb("Synthetic home", "0001"), ffvb("Synthetic away", "0002"));

    // Then
    assertThat(seasons.getOrCreate(2026L)).isEqualTo(first);
    assertThat(first.label()).isEqualTo("2026/2027");
    assertThat(firstMatch.id()).isNotEqualTo(nextMatch.id());
    TeamView firstTeam = reads.team(firstMatch.homeTeamId()).orElseThrow();
    TeamView nextTeam = reads.team(nextMatch.homeTeamId()).orElseThrow();
    assertThat(firstTeam.id()).isNotEqualTo(nextTeam.id());
    assertThat(firstTeam.clubId()).isEqualTo(nextTeam.clubId());
    assertThat(reads.club(firstTeam.clubId()).orElseThrow().reference()).isEqualTo("0001");
    assertThat(reads.club(firstTeam.clubId()).orElseThrow().sourceName()).isNull();
  }

  @Test
  @DisplayName(
      "Shares one contextual team across compatible pools and retains distinct named teams")
  void sharesCompatibleTeams() {
    // Given
    SeasonView season = seasons.getOrCreate(2026L);
    PoolView first = pool(season, "A", null, CollectionProviderEnum.FFVB);
    PoolView second = pool(season, "B", null, CollectionProviderEnum.FFVB);

    // When
    MatchView one =
        identities.identifyMatch(
            first.id(), "M1", ffvb("Saint d’Or 1", "0001"), ffvb("Visitors", "0002"));
    MatchView two =
        identities.identifyMatch(
            second.id(), "M2", ffvb("SAINT  D'OR 1", "0001"), ffvb("Saint d’Or 2", "0001"));

    // Then
    assertThat(one.homeTeamId()).isEqualTo(two.homeTeamId());
    assertThat(two.homeTeamId()).isNotEqualTo(two.awayTeamId());
    assertThat(
            sql.queryForObject(
                "SELECT count(*) FROM sporting_participation WHERE team_id = ?",
                Long.class,
                one.homeTeamId()))
        .isEqualTo(2L);
    assertThat(reads.team(two.homeTeamId()).orElseThrow().sourceName()).isEqualTo("SAINT  D'OR 1");
  }

  @Test
  @DisplayName(
      "Keeps match references scoped to pools independently from dates and participant pairs")
  void scopesMatchReferences() {
    // Given
    SeasonView season = seasons.getOrCreate(2026L);
    PoolView first = pool(season, "A", null, CollectionProviderEnum.FFVB);
    PoolView second = pool(season, "A", "tour-2", CollectionProviderEnum.FFVB);
    MatchView match =
        identities.identifyMatch(first.id(), "M1", ffvb("Home", "0001"), ffvb("Away", "0002"));
    sql.update("UPDATE sporting_match SET local_date = DATE '2027-02-01' WHERE id = ?", match.id());

    // When
    MatchView postponed =
        identities.identifyMatch(first.id(), "M1", ffvb("Home", "0001"), ffvb("Away", "0002"));
    MatchView repeated =
        identities.identifyMatch(first.id(), "M2", ffvb("Home", "0001"), ffvb("Away", "0002"));
    MatchView otherContext =
        identities.identifyMatch(second.id(), "M1", ffvb("Home", "0001"), ffvb("Away", "0002"));

    // Then
    assertThat(postponed).isEqualTo(match);
    assertThat(repeated.id()).isNotEqualTo(match.id());
    assertThat(otherContext.id()).isNotEqualTo(match.id());
    assertThat(
            sql.queryForObject(
                "SELECT local_date FROM sporting_match WHERE id = ?",
                java.time.LocalDate.class,
                match.id()))
        .isEqualTo(java.time.LocalDate.of(2027, 2, 1));
    assertThat(
            sql.queryForObject(
                "SELECT local_date FROM sporting_match WHERE id = ?",
                java.time.LocalDate.class,
                repeated.id()))
        .isNull();
  }

  @ParameterizedTest
  @CsvSource(
      nullValues = "NULL",
      textBlock =
          """
      NULL, NULL
      tour-1, NULL
      NULL, group-1
      tour-1, group-1
      """)
  @DisplayName("Reuses the native pool identity with present or absent tour and group")
  void reusesOptionalPoolContext(String tour, String group) {
    // Given
    SeasonView season = seasons.getOrCreate(2026L);
    PoolKey key =
        new PoolKey(
            CollectionProviderEnum.FFVB, season.id(), "LIG", "competition", tour, group, "A");
    SportingClassification classification =
        new SportingClassification(DIVISION, SportFormatEnum._6X6, SportGenderEnum.MIXED);
    PoolView existing = identities.establishPool(key, "pack", "Synthetic pool", classification);

    // When
    PoolView repeated = identities.establishPool(key, "pack", "Synthetic pool", classification);

    // Then
    assertThat(repeated).isEqualTo(existing);
    assertThat(sql.queryForObject("SELECT count(*) FROM sporting_pool", Long.class)).isEqualTo(1L);
  }

  @Test
  @DisplayName("Preserves known matches when an FFVB participant cannot be associated")
  void refusesUnrecognizedReplacement() {
    // Given
    PoolView pool = pool(seasons.getOrCreate(2026L), "A", null, CollectionProviderEnum.FFVB);
    MatchView match =
        identities.identifyMatch(pool.id(), "M1", ffvb("Home 1", "0001"), ffvb("Away", "0002"));

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable replace =
        () ->
            identities.identifyMatch(pool.id(), "M1", ffvb("Home 2", "0001"), ffvb("Away", "0002"));

    // Then
    assertThatThrownBy(replace).isInstanceOf(UnresolvedSportingIdentityException.class);
    assertThat(reads.match(match.id())).contains(match);
    assertThat(reads.team(match.homeTeamId()).orElseThrow().sourceName()).isEqualTo("Home 1");
    assertThat(sql.queryForObject("SELECT count(*) FROM sporting_team", Long.class)).isEqualTo(2L);
  }

  @Test
  @DisplayName("Uses scoped verified aliases without merging a similarly named club")
  void resolvesVerifiedAlias() {
    // Given
    PoolView pool = pool(seasons.getOrCreate(2026L), "A", null, CollectionProviderEnum.FFVB);
    MatchView match =
        identities.identifyMatch(pool.id(), "M1", ffvb("Home 1", "0001"), ffvb("Away", "0002"));
    sql.update(
        "INSERT INTO sporting_team_alias(team_id, season_id, organizer_reference, competition_reference, comparison_name) VALUES (?, ?, 'LIG', 'competition', 'renamed home')",
        match.homeTeamId(),
        pool.key().seasonId());

    // When
    MatchView renamed =
        identities.identifyMatch(
            pool.id(), "M1", ffvb("Renamed home", "0001"), ffvb("Away", "0002"));
    MatchView otherClub =
        identities.identifyMatch(
            pool.id(), "M2", ffvb("Renamed home", "0003"), ffvb("Away", "0002"));

    // Then
    assertThat(renamed).isEqualTo(match);
    assertThat(otherClub.homeTeamId()).isNotEqualTo(match.homeTeamId());
    assertThat(reads.team(match.homeTeamId()).orElseThrow().sourceName()).isEqualTo("Renamed home");
  }

  @Test
  @DisplayName("Keeps qualified LNV teams through labels and optional club association")
  void preservesProfessionalIdentity() {
    // Given
    PoolView pool = pool(seasons.getOrCreate(2026L), "phase", null, CollectionProviderEnum.LNV);
    MatchView match =
        identities.identifyMatch(
            pool.id(),
            "M1",
            new TeamCandidate("T1", "Home", null, null),
            new TeamCandidate("T2", "Away", null, null));
    assertThat(reads.team(match.homeTeamId()).orElseThrow().clubId()).isNull();

    // When
    MatchView renamed =
        identities.identifyMatch(
            pool.id(),
            "M1",
            new TeamCandidate("T1", "Renamed home", null, null),
            new TeamCandidate("T2", "Away", null, null));

    // Then
    assertThat(renamed).isEqualTo(match);
    assertThat(reads.team(match.homeTeamId()).orElseThrow().sourceName()).isEqualTo("Renamed home");
    assertThat(sql.queryForObject("SELECT count(*) FROM sporting_club", Long.class)).isZero();
  }

  @Test
  @DisplayName("Rolls back a complete encounter when the other FFVB club cannot be identified")
  void rollsBackUnidentifiedClub() {
    // Given
    PoolView pool = pool(seasons.getOrCreate(2026L), "A", null, CollectionProviderEnum.FFVB);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable identify =
        () -> identities.identifyMatch(pool.id(), "M1", ffvb("Home", "0001"), ffvb("Away", null));

    // Then
    assertThatThrownBy(identify).isInstanceOf(UnresolvedSportingIdentityException.class);
    assertThat(sql.queryForObject("SELECT count(*) FROM sporting_club", Long.class)).isZero();
    assertThat(sql.queryForObject("SELECT count(*) FROM sporting_team", Long.class)).isZero();
    assertThat(sql.queryForObject("SELECT count(*) FROM sporting_match", Long.class)).isZero();
  }

  @Test
  @DisplayName("Rejects a verified alias outside its qualified competition")
  void confinesAliasContext() {
    // Given
    SeasonView season = seasons.getOrCreate(2026L);
    PoolView first = pool(season, "A", null, CollectionProviderEnum.FFVB);
    PoolView other =
        identities.establishPool(
            new PoolKey(
                CollectionProviderEnum.FFVB,
                season.id(),
                "LIG",
                "other-competition",
                null,
                null,
                "A"),
            "pack",
            "Synthetic pool",
            first.classification());
    MatchView match =
        identities.identifyMatch(first.id(), "M1", ffvb("Home", "0001"), ffvb("Away", "0002"));
    MatchView otherMatch =
        identities.identifyMatch(other.id(), "M1", ffvb("Home", "0001"), ffvb("Away", "0002"));
    sql.update(
        "INSERT INTO sporting_team_alias(team_id, season_id, organizer_reference, competition_reference, comparison_name) VALUES (?, ?, 'LIG', 'competition', 'renamed home')",
        match.homeTeamId(),
        season.id());

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable identify =
        () ->
            identities.identifyMatch(
                other.id(), "M1", ffvb("Renamed home", "0001"), ffvb("Away", "0002"));

    // Then
    assertThatThrownBy(identify).isInstanceOf(UnresolvedSportingIdentityException.class);
    assertThat(reads.match(otherMatch.id())).contains(otherMatch);
    assertThat(reads.team(match.homeTeamId()).orElseThrow().sourceName()).isEqualTo("Home");
  }

  @Test
  @DisplayName(
      "Retains a technical professional club association without transferring it to another season")
  void retainsOptionalProfessionalClub() {
    // Given
    PoolView pool = pool(seasons.getOrCreate(2026L), "phase", null, CollectionProviderEnum.LNV);
    MatchView match =
        identities.identifyMatch(
            pool.id(),
            "M1",
            new TeamCandidate("T1", "Home", null, null),
            new TeamCandidate("T2", "Away", null, null));
    UUID club = UUID.fromString("00000000-0000-4000-8000-000000000020");
    sql.update(
        "INSERT INTO sporting_club(id, provider, reference) VALUES (?, 'FFVB', '0001')", club);
    sql.update("UPDATE sporting_team SET club_id = ? WHERE id = ?", club, match.homeTeamId());
    PoolView next = pool(seasons.getOrCreate(2027L), "phase", null, CollectionProviderEnum.LNV);

    // When
    MatchView current =
        identities.identifyMatch(
            pool.id(),
            "M1",
            new TeamCandidate("T1", "Renamed home", null, null),
            new TeamCandidate("T2", "Away", null, null));
    MatchView newSeason =
        identities.identifyMatch(
            next.id(),
            "M1",
            new TeamCandidate("T1", "Renamed home", null, null),
            new TeamCandidate("T2", "Away", null, null));

    // Then
    assertThat(current.id()).isEqualTo(match.id());
    assertThat(reads.team(current.homeTeamId()).orElseThrow().clubId()).isEqualTo(club);
    assertThat(newSeason.homeTeamId()).isNotEqualTo(current.homeTeamId());
    assertThat(reads.team(newSeason.homeTeamId()).orElseThrow().clubId()).isNull();
  }

  @Test
  @DisplayName("Enforces FFVB uniqueness at database commit, independently from lookup")
  void enforcesTeamUniqueness() {
    // Given
    PoolView pool = pool(seasons.getOrCreate(2026L), "A", null, CollectionProviderEnum.FFVB);
    MatchView match =
        identities.identifyMatch(pool.id(), "M1", ffvb("Home", "0001"), ffvb("Away", "0002"));
    TeamView home = reads.team(match.homeTeamId()).orElseThrow();
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable duplicate =
        () ->
            transaction.executeWithoutResult(
                state -> store.createTeam(pool, home.clubId(), ffvb("Home", "0001"), "home"));

    // Then
    assertThatThrownBy(duplicate)
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasStackTraceContaining("uk_team_ffvb");
    assertThat(sql.queryForObject("SELECT count(*) FROM sporting_team", Long.class)).isEqualTo(2L);
  }

  @Test
  @DisplayName(
      "Enforces LNV uniqueness by championship and native TeamID independently from label or club")
  void enforcesProfessionalUniqueness() {
    // Given
    PoolView pool = pool(seasons.getOrCreate(2026L), "phase", null, CollectionProviderEnum.LNV);
    identities.identifyMatch(
        pool.id(),
        "M1",
        new TeamCandidate("T1", "Home", null, null),
        new TeamCandidate("T2", "Away", null, null));
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable duplicate =
        () ->
            transaction.executeWithoutResult(
                state ->
                    store.createTeam(
                        pool,
                        null,
                        new TeamCandidate("T1", "Different label", null, null),
                        "different label"));

    // Then
    assertThatThrownBy(duplicate)
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasStackTraceContaining("uk_team_lnv");
    assertThat(sql.queryForObject("SELECT count(*) FROM sporting_team", Long.class)).isEqualTo(2L);
  }

  @Test
  @DisplayName("Treats absent tour and group as one unique native pool context")
  void enforcesOptionalPoolContextUniqueness() {
    // Given
    PoolView pool = pool(seasons.getOrCreate(2026L), "A", null, CollectionProviderEnum.FFVB);
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable duplicate =
        () ->
            transaction.executeWithoutResult(
                state ->
                    store.createPool(pool.key(), "pack", "Changed label", pool.classification()));

    // Then
    assertThatThrownBy(duplicate)
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasStackTraceContaining("uk_pool_identity");
    assertThat(sql.queryForObject("SELECT count(*) FROM sporting_pool", Long.class)).isEqualTo(1L);
  }

  @Test
  @DisplayName("Keeps one canonical row per qualified sporting start year")
  void enforcesCanonicalSeasonUniqueness() {
    // Given
    seasons.getOrCreate(2026L);
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable duplicate =
        () ->
            transaction.executeWithoutResult(
                state -> store.createSeason(2026L, "Another provider label"));

    // Then
    assertThatThrownBy(duplicate)
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasStackTraceContaining("uk_season_identity");
    assertThat(sql.queryForObject("SELECT count(*) FROM sporting_season", Long.class))
        .isEqualTo(1L);
  }

  @Test
  @DisplayName("Rejects a division name differing only by case")
  void protectsDivisionName() {
    // Given
    UUID other = UUID.fromString("00000000-0000-4000-8000-000000000011");

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable duplicate =
        () ->
            sql.update(
                "INSERT INTO sporting_division(id, name, active, color) VALUES (?, 'SYNTHETIC DIVISION', true, '#112233')",
                other);

    // Then
    assertThatThrownBy(duplicate).isInstanceOf(DataIntegrityViolationException.class);
    assertThat(reads.division(DIVISION).orElseThrow().name()).isEqualTo("Synthetic division");
    assertThat(reads.division(other)).isEmpty();
  }

  @Test
  @DisplayName("Keeps controlled search terms unique on their real division owner")
  void protectsDivisionTerms() {
    // Given
    sql.update(
        "INSERT INTO sporting_division_term(division_id, term) VALUES (?, 'National')", DIVISION);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable duplicate =
        () ->
            sql.update(
                "INSERT INTO sporting_division_term(division_id, term) VALUES (?, 'National')",
                DIVISION);

    // Then
    assertThatThrownBy(duplicate).isInstanceOf(DataIntegrityViolationException.class);
    assertThat(reads.division(DIVISION).orElseThrow().searchTerms()).containsExactly("National");
  }

  @Test
  @DisplayName("Rejects a participation whose team owner does not exist")
  void enforcesOwnerForeignKeys() {
    // Given
    PoolView pool = pool(seasons.getOrCreate(2026L), "A", null, CollectionProviderEnum.FFVB);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable orphan =
        () ->
            sql.update(
                "INSERT INTO sporting_participation(id, team_id, pool_id, current) VALUES (?, ?, ?, true)",
                UUID.fromString("00000000-0000-4000-8000-000000000030"),
                UUID.fromString("00000000-0000-4000-8000-000000000031"),
                pool.id());

    // Then
    assertThatThrownBy(orphan).isInstanceOf(DataIntegrityViolationException.class);
    assertThat(sql.queryForObject("SELECT count(*) FROM sporting_participation", Long.class))
        .isZero();
  }

  @Test
  @DisplayName(
      "Rolls back the losing cross-season club creation without replay or partial identities")
  void isolatesConcurrentClubCreation() throws Exception {
    // Given
    PoolView first = pool(seasons.getOrCreate(2026L), "A", null, CollectionProviderEnum.FFVB);
    PoolView second = pool(seasons.getOrCreate(2027L), "A", null, CollectionProviderEnum.FFVB);
    CyclicBarrier bothRead = new CyclicBarrier(2);
    doAnswer(
            invocation -> {
              Object existing = invocation.callRealMethod();
              bothRead.await(10, TimeUnit.SECONDS);
              return existing;
            })
        .when(store)
        .club(CollectionProviderEnum.FFVB, "race-club");

    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      // When
      Future<MatchView> one =
          workers.submit(
              () ->
                  identities.identifyMatch(
                      first.id(), "M1", ffvb("Home", "race-club"), ffvb("Away", "away-one")));
      Future<MatchView> two =
          workers.submit(
              () ->
                  identities.identifyMatch(
                      second.id(), "M1", ffvb("Home", "race-club"), ffvb("Away", "away-two")));
      List<Object> outcomes = List.of(outcome(one), outcome(two));

      // Then
      assertThat(outcomes.stream().filter(MatchView.class::isInstance)).hasSize(1);
      assertThat(outcomes.stream().filter(DataIntegrityViolationException.class::isInstance))
          .hasSize(1);
      assertThat(sql.queryForObject("SELECT count(*) FROM sporting_match", Long.class))
          .isEqualTo(1L);
      assertThat(sql.queryForObject("SELECT count(*) FROM sporting_team", Long.class))
          .isEqualTo(2L);
      assertThat(sql.queryForObject("SELECT count(*) FROM sporting_club", Long.class))
          .isEqualTo(2L);
    }
  }

  @Test
  @DisplayName("Reads the committed classification only after acquiring the season lock")
  void readsClassificationAfterLock() throws Exception {
    // Given
    PoolView pool = pool(seasons.getOrCreate(2026L), "A", null, CollectionProviderEnum.FFVB);
    CompletableFuture<Void> attempted = new CompletableFuture<>();
    doAnswer(
            invocation -> {
              attempted.complete(null);
              return invocation.callRealMethod();
            })
        .when(store)
        .lockPoolSeason(pool.id());
    TransactionTemplate correction = new TransactionTemplate(transactions);

    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<MatchView> work =
          correction.execute(
              state -> {
                store.lockSeason(pool.key().seasonId());
                sql.update("UPDATE sporting_pool SET format = '_4X4' WHERE id = ?", pool.id());
                Future<MatchView> pending =
                    worker.submit(
                        () ->
                            identities.identifyMatch(
                                pool.id(), "M1", ffvb("Home", "0001"), ffvb("Away", "0002")));
                attempted.orTimeout(10, TimeUnit.SECONDS).join();
                return pending;
              });

      MatchView result = work.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(reads.team(result.homeTeamId()).orElseThrow().classification().format())
          .isEqualTo(SportFormatEnum._4X4);
      assertThat(reads.team(result.awayTeamId()).orElseThrow().classification().format())
          .isEqualTo(SportFormatEnum._4X4);
    }
  }

  /**
   * Observes one bounded concurrent transaction, retaining its actual failure for assertions.
   *
   * @param work submitted application operation
   * @return committed identity or the transaction's actual rejection
   * @throws Exception if workers fail to finish within the test boundary
   */
  private static Object outcome(Future<MatchView> work) throws Exception {
    try {
      return work.get(15, TimeUnit.SECONDS);
    } catch (ExecutionException failure) {
      return failure.getCause();
    }
  }

  /**
   * Supplies qualified pool context while exposing the identity-changing native parts.
   *
   * @param season explicitly selected canonical season
   * @param reference native pool or phase reference
   * @param tour independently published tour, or null
   * @param provider designated sporting source
   * @return persisted pool with the test's established classification
   */
  private PoolView pool(
      SeasonView season, String reference, String tour, CollectionProviderEnum provider) {
    return identities.establishPool(
        new PoolKey(provider, season.id(), "LIG", "competition", tour, null, reference),
        "pack",
        "Synthetic pool",
        new SportingClassification(DIVISION, SportFormatEnum._6X6, SportGenderEnum.MIXED));
  }

  /**
   * Keeps the FFVB club reference explicit; no club-page evidence is fabricated.
   *
   * @param name exact source team label
   * @param club qualified club reference, including leading zeros
   * @return attributable calendar participant
   */
  private static TeamCandidate ffvb(String name, String club) {
    return new TeamCandidate(null, name, club, null);
  }
}
