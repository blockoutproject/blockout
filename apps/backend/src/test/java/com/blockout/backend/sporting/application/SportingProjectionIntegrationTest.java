package com.blockout.backend.sporting.application;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.DIVISION;
import static com.blockout.backend.sporting.support.SportingIngestionFixture.SOURCE;
import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Changed;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Scope;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.CatalogObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingPublicInput;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.model.SportingVisibility.Reason;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.service.AcceptCalendar;
import com.blockout.backend.sporting.application.service.AcceptCatalog;
import com.blockout.backend.sporting.application.service.AcceptMatchObservation;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.application.service.ReadSportingAcquisition;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real admitted F01 cycles and committed F02 transactions against the migrated PostgreSQL schema.
 */
@Import(SportingIdentityFixture.class)
@SpringBootTest
@RecordApplicationEvents
@Testcontainers
@DisplayName("Current public inputs and after-commit projection handoff")
class SportingProjectionIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-10-19T12:00:00Z");
  @Autowired private JdbcTemplate sql;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private AdmitCollectionCycle cycles;
  @Autowired private RegisterCollectorRuntime runtimes;
  @Autowired private AcceptCalendar calendars;
  @Autowired private AcceptMatchObservation matches;
  @Autowired private AcceptCatalog catalogs;
  @Autowired private ReadSportingData reads;
  @Autowired private ReadSportingAcquisition acquisitionReads;
  @Autowired private ApplicationEvents events;
  @Autowired private SportingProjectionChanges projectionChanges;
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
   *
   * @throws Exception if the disposable fixture cannot be reset
   */
  @BeforeEach
  void admit() throws Exception {
    SportingIngestionFixture.reset(DATABASE);
    SportingIngestionFixture.Scope scope =
        SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes);
    season = scope.season();
    pool = scope.pool();
    cycle = scope.cycle();
  }

  @Test
  @DisplayName("Projection handoff requires the transaction that owns the sporting mutation")
  void refusesHandoffOutsideTransaction() {
    // Given
    events.clear();

    // When
    Throwable thrown =
        catchThrowable(() -> projectionChanges.submit(SportingProjectionChanges.Kind.POOL, pool));

    // Then
    assertThat(thrown).isInstanceOf(IllegalTransactionStateException.class);
    assertThat(events.stream(Changed.class)).isEmpty();
  }

  @Test
  @DisplayName("Projection handoff is delivered only after a successful sporting commit")
  void handsOffCommittedScopes() {
    // Given
    calendars.accept(pool, calendar(1, List.of(candidate("M1", "Home", null))));
    events.clear();
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    transaction.executeWithoutResult(
        status -> {
          catalogs.accept(SOURCE, new CatalogObservation(context(2), true, List.of()));
          assertThat(events.stream(Changed.class)).isEmpty();
          status.setRollbackOnly();
        });
    assertThat(events.stream(Changed.class)).isEmpty();
    transaction.executeWithoutResult(
        status -> {
          catalogs.accept(SOURCE, new CatalogObservation(context(3), true, List.of()));
          assertThat(events.stream(Changed.class)).isEmpty();
        });

    // Then
    assertThat(events.stream(Changed.class).flatMap(change -> change.scopes().stream()))
        .contains(new Scope(SportingProjectionChanges.Kind.POOL, pool));
    assertThat(reads.visibility(Kind.POOL, pool).orElseThrow().reasons())
        .containsExactly(Reason.CATALOG_ABSENT);
    Set<Scope> dependents =
        reads.projectionDependents(Set.of(new Scope(SportingProjectionChanges.Kind.POOL, pool)));
    assertThat(dependents).anyMatch(scope -> scope.kind() == SportingProjectionChanges.Kind.TEAM);
  }

  @Test
  @DisplayName("Score-only details submit no search projection work")
  void ignoresScoreOnlyProjectionChanges() {
    // Given
    ObservationOutcome first =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))))
            .outcomes()
            .getFirst();
    events.clear();
    MatchObservation.Facts score =
        new MatchObservation.Facts(
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            null,
            JsonNullable.of(new MatchObservation.Result(ResultStateEnum.FINAL, 3, 1, null)),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined());

    // When
    matches.detail(new MatchObservation(first.resourceId(), context(2), score));

    // Then
    assertThat(events.stream(Changed.class)).isEmpty();
  }

  @Test
  @DisplayName("Source renaming reaches dependent teams and pools after commit")
  void handsOffSourceRenaming() {
    // Given
    ObservationOutcome first =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))))
            .outcomes()
            .getFirst();
    events.clear();

    // When
    calendars.accept(
        pool, calendar(3, List.of(candidate("M1", "HOME", LocalDate.of(2026, 10, 1)))));

    // Then
    Set<Scope> changed =
        events.stream(Changed.class)
            .flatMap(change -> change.scopes().stream())
            .collect(Collectors.toSet());
    assertThat(changed)
        .contains(new Scope(SportingProjectionChanges.Kind.TEAM, first.homeTeamId()));
    assertThat(reads.projectionDependents(changed))
        .contains(new Scope(SportingProjectionChanges.Kind.POOL, pool));
  }

  @Test
  @DisplayName("Projection hydration rereads permitted city, scoped aliases and current visibility")
  void hydratesCurrentCanonicalValues() {
    // Given
    ObservationOutcome first =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", null))))
            .outcomes()
            .getFirst();
    UUID club = acquisitionReads.team(first.homeTeamId()).orElseThrow().clubId();
    sql.update("UPDATE sporting_club SET municipality='Synthetic city' WHERE id=?", club);
    sql.update(
        "INSERT INTO sporting_division_term(division_id,term) VALUES (?,'N2'),(?,'National 2')",
        DIVISION,
        DIVISION);
    sql.update(
        "INSERT INTO sporting_team_alias(team_id,season_id,organizer_reference,competition_reference,comparison_name) VALUES (?,?,'SYNTHETIC','COMP','home alias')",
        first.homeTeamId(),
        season);
    SportingPublicInput previous =
        reads.publicInputs(Kind.TEAM, Set.of(first.homeTeamId())).getFirst();

    // When
    sql.update("UPDATE sporting_club SET municipality_restricted=TRUE WHERE id=?", club);
    SportingPublicInput current =
        reads.publicInputs(Kind.TEAM, Set.of(first.homeTeamId())).getFirst();

    // Then
    assertThat(previous.city()).isEqualTo("Synthetic city");
    assertThat(current.city()).isNull();
    assertThat(current.id()).isEqualTo(first.homeTeamId());
    assertThat(current.seasonId()).isEqualTo(season);
    assertThat(current.sourceName()).isEqualTo("Home");
    assertThat(current.effectiveName()).isEqualTo("Home");
    assertThat(current.clubId()).isEqualTo(club);
    assertThat(current.classification().divisionId()).isEqualTo(DIVISION);
    assertThat(current.divisionName()).isEqualTo("Synthetic");
    assertThat(current.divisionTerms()).containsExactlyInAnyOrder("N2", "National 2");
    SportingPublicInput poolInput = reads.publicInputs(Kind.POOL, Set.of(pool)).getFirst();
    assertThat(poolInput.classification()).isEqualTo(current.classification());
    assertThat(poolInput.divisionTerms()).containsExactlyInAnyOrder("N2", "National 2");
    assertThat(current.aliases()).extracting(alias -> alias.name()).containsExactly("home alias");
    assertThat(
            reads.projectionDependents(
                Set.of(new Scope(SportingProjectionChanges.Kind.CLUB, club))))
        .contains(
            new Scope(SportingProjectionChanges.Kind.TEAM, first.homeTeamId()),
            new Scope(SportingProjectionChanges.Kind.POOL, pool));
    assertThat(reads.projectionInputs(Kind.TEAM, 0, 1)).hasSize(1);
  }

  @Test
  @DisplayName("Professional projection keeps absent club context null")
  void projectsUnattachedProfessionalTeam() {
    // Given
    UUID professional =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.LNV, season, "LNV", "CHAMP", null, null, "PHASE"),
                "LNV_PACK",
                "Professional phase",
                new SportingClassification(DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    UUID team =
        identities
            .identifyMatch(
                professional,
                "NATIVE",
                new TeamCandidate("HOME", "Professional home", null, null),
                new TeamCandidate("AWAY", "Professional away", null, null))
            .homeTeamId();

    // When
    SportingPublicInput input = reads.publicInputs(Kind.TEAM, Set.of(team)).getFirst();

    // Then
    assertThat(input.sourceName()).isEqualTo("Professional home");
    assertThat(input.clubId()).isNull();
    assertThat(input.clubName()).isNull();
    assertThat(input.city()).isNull();
    assertThat(input.poolIds()).containsExactly(professional);
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
}
