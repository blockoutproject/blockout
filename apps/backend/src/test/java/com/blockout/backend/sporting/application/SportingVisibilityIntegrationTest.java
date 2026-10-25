package com.blockout.backend.sporting.application;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.CONTROL;
import static com.blockout.backend.sporting.support.SportingIngestionFixture.DIVISION;
import static com.blockout.backend.sporting.support.SportingIngestionFixture.SOURCE;
import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.ChangeCollectionControls;
import com.blockout.backend.collection.application.service.CloseCollectionSeason;
import com.blockout.backend.collection.application.service.ReadCollectionWork;
import com.blockout.backend.collection.application.service.RecordCollectionResults;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.generated.ingestion.model.StandingsPublicationStateEnum;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.CatalogObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.model.SportingVisibility.Reason;
import com.blockout.backend.sporting.application.model.StandingsObservation;
import com.blockout.backend.sporting.application.model.StandingsView;
import com.blockout.backend.sporting.application.service.AcceptCalendar;
import com.blockout.backend.sporting.application.service.AcceptCatalog;
import com.blockout.backend.sporting.application.service.AcceptMatchObservation;
import com.blockout.backend.sporting.application.service.AcceptStandings;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.application.service.ReadCollectionSeasons;
import com.blockout.backend.sporting.application.service.ReadSportingAcquisition;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import jakarta.persistence.EntityManagerFactory;
import java.net.URI;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real admitted F01 cycles and committed F02 transactions against the migrated PostgreSQL schema.
 */
@Import(SportingIdentityFixture.class)
@SpringBootTest
@Testcontainers
@DisplayName("Independent visibility reasons and retained sporting history")
class SportingVisibilityIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-10-19T12:00:00Z");
  @Autowired private JdbcTemplate sql;
  @Autowired private EntityManagerFactory entityManagerFactory;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private ReadCollectionSeasons seasonReads;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private AdmitCollectionCycle cycles;
  @Autowired private RegisterCollectorRuntime runtimes;
  @Autowired private ReadCollectionWork collectionWork;
  @Autowired private AcceptCalendar calendars;
  @Autowired private AcceptMatchObservation matches;
  @Autowired private AcceptCatalog catalogs;
  @Autowired private ReadSportingData reads;
  @Autowired private ReadSportingAcquisition acquisitionReads;
  @Autowired private AcceptStandings standings;
  @Autowired private CloseCollectionSeason closure;
  @Autowired private RecordCollectionResults results;

  @Autowired private ChangeCollectionControls controls;

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

  @ParameterizedTest
  @EnumSource(Kind.class)
  @DisplayName("Visibility reads only authorization facts without materializing sporting content")
  void readsVisibilityWithoutLoadingEntities(Kind kind) {
    // Given
    ObservationOutcome match =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))))
            .outcomes()
            .getFirst();
    UUID id =
        switch (kind) {
          case CLUB -> acquisitionReads.team(match.homeTeamId()).orElseThrow().clubId();
          case TEAM -> match.homeTeamId();
          case POOL -> pool;
          case MATCH -> match.resourceId();
        };
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    boolean enabled = statistics.isStatisticsEnabled();
    statistics.setStatisticsEnabled(true);
    try {
      long loaded = statistics.getEntityLoadCount();

      // When
      SportingVisibility visibility = reads.visibility(kind, id).orElseThrow();

      // Then
      assertThat(visibility.viewable()).isTrue();
      assertThat(statistics.getEntityLoadCount() - loaded).isZero();
    } finally {
      statistics.setStatisticsEnabled(enabled);
    }
  }

  @Test
  @DisplayName("An unclassified retained match keeps every independent hiding reason")
  void retainsUnclassifiedMatchReasons() {
    // Given
    UUID match =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", null))))
            .outcomes()
            .getFirst()
            .resourceId();
    sql.update(
        "UPDATE sporting_pool SET division_id=NULL, format=NULL, gender=NULL, catalog_eligible=FALSE, calendar_empty=TRUE WHERE id=?",
        pool);
    sql.update("UPDATE sporting_match SET present=FALSE WHERE id=?", match);

    // When
    SportingVisibility visibility = reads.visibility(Kind.MATCH, match).orElseThrow();

    // Then
    assertThat(visibility.reasons())
        .containsExactlyInAnyOrder(
            Reason.UNCLASSIFIED,
            Reason.CATALOG_ABSENT,
            Reason.CALENDAR_EMPTY,
            Reason.ITEM_ABSENT,
            Reason.DATE_UNKNOWN,
            Reason.NO_VISIBLE_PARTICIPATION);
  }

  @Test
  @DisplayName("One qualified empty current calendar withdraws retained participations")
  void withdrawsEmptyCalendar() {
    // Given
    calendars.accept(
        pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))));

    // When
    ObservationOutcome.Calendar empty = calendars.accept(pool, calendar(2, List.of()));

    // Then
    assertThat(empty.absenceReconciled()).isTrue();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_participation WHERE current=TRUE", Integer.class))
        .isZero();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("A complete nonempty calendar withdraws only its missing participants")
  void withdrawsMissingParticipation() {
    // Given
    calendars.accept(
        pool, calendar(1, List.of(candidate("M1", "Home", null), candidate("M2", "Other", null))));

    // When
    calendars.accept(pool, calendar(2, List.of(candidate("M1", "Home", null))));

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_participation WHERE current=TRUE", Integer.class))
        .isEqualTo(2);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_team", Integer.class))
        .isEqualTo(3);
  }

  @Test
  @DisplayName("Catalog rediscovery clears only catalog absence after an empty calendar")
  void keepsIndependentReasons() {
    // Given
    UUID match =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))))
            .outcomes()
            .getFirst()
            .resourceId();
    calendars.accept(pool, calendar(2, List.of()));
    catalogs.accept(SOURCE, new CatalogObservation(context(3), true, List.of()));
    assertThat(reads.visibility(Kind.POOL, pool).orElseThrow().reasons())
        .containsExactlyInAnyOrder(Reason.CALENDAR_EMPTY, Reason.CATALOG_ABSENT);

    // When
    catalogs.accept(
        SOURCE, new CatalogObservation(context(4), true, List.of(catalogPool("POOL", "Returned"))));

    // Then
    assertThat(reads.visibility(Kind.POOL, pool).orElseThrow().reasons())
        .containsExactly(Reason.CALENDAR_EMPTY);
    assertThat(reads.publicMatch(match)).isEmpty();
    assertThat(
            acquisitionReads.acquisitionPools(
                season, CollectionProviderEnum.FFVB, "SYNTHETIC", false, NOW.toInstant(), null))
        .extracting(reference -> reference.scopeId())
        .contains(pool);
  }

  @Test
  @DisplayName(
      "Attributable calendar return reuses identities while inactive division still hides them")
  void restoresOnlyCalendarReason() {
    // Given
    ObservationOutcome first =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))))
            .outcomes()
            .getFirst();
    calendars.accept(pool, calendar(2, List.of()));
    sql.update("UPDATE sporting_division SET active=FALSE WHERE id=?", DIVISION);

    // When
    ObservationOutcome returned =
        calendars
            .accept(pool, calendar(3, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 2)))))
            .outcomes()
            .getFirst();

    // Then
    assertThat(returned.resourceId()).isEqualTo(first.resourceId());
    assertThat(returned.homeTeamId()).isEqualTo(first.homeTeamId());
    assertThat(reads.visibility(Kind.POOL, pool).orElseThrow().reasons())
        .containsExactly(Reason.DIVISION_INACTIVE);
    assertThat(reads.publicMatch(first.resourceId())).isEmpty();
    assertThat(reads.club(acquisitionReads.team(first.homeTeamId()).orElseThrow().clubId()))
        .isPresent();
  }

  @Test
  @DisplayName("A second visible participation keeps the retained team usable")
  void preservesOtherParticipation() {
    // Given
    UUID other =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.FFVB, season, "SYNTHETIC", "COMP", null, null, "OTHER"),
                "PACK",
                "Other pool",
                new SportingClassification(DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    ObservationOutcome first =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))))
            .outcomes()
            .getFirst();
    identities.identifyMatch(
        other, "M2", candidate("M2", "Home", null).home(), candidate("M2", "Home", null).away());

    // When
    calendars.accept(pool, calendar(2, List.of()));

    // Then
    assertThat(reads.visibility(Kind.TEAM, first.homeTeamId()).orElseThrow().viewable()).isTrue();
    assertThat(reads.publicInputs(Kind.TEAM, Set.of(first.homeTeamId())).getFirst().poolIds())
        .containsExactly(other);
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_participation WHERE team_id=?",
                Integer.class,
                first.homeTeamId()))
        .isEqualTo(2);
  }

  @Test
  @DisplayName("A club remains publicly consultable with no visible seasonal team")
  void preservesClubBetweenSeasons() {
    // Given
    ObservationOutcome first =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", null))))
            .outcomes()
            .getFirst();
    UUID club = acquisitionReads.team(first.homeTeamId()).orElseThrow().clubId();

    // When
    calendars.accept(pool, calendar(2, List.of()));

    // Then
    assertThat(reads.publicInputs(Kind.CLUB, Set.of(club)))
        .extracting(input -> input.id())
        .containsExactly(club);
    assertThat(reads.publicInputs(Kind.TEAM, Set.of(first.homeTeamId()))).isEmpty();
  }

  @Test
  @DisplayName(
      "A successful nonempty calendar hides an absent scored match without deleting its result")
  void retainsWithdrawnResult() {
    // Given
    ObservationOutcome first =
        calendars
            .accept(
                pool,
                calendar(
                    1,
                    List.of(
                        candidate("M1", "Home", LocalDate.of(2026, 10, 1)),
                        candidate("M2", "Other", LocalDate.of(2026, 10, 2)))))
            .outcomes()
            .getFirst();
    sql.update(
        "UPDATE sporting_match SET home_sets=3,away_sets=1,result_state='FINAL' WHERE id=?",
        first.resourceId());

    // When
    calendars.accept(
        pool, calendar(2, List.of(candidate("M2", "Other", LocalDate.of(2026, 10, 2)))));

    // Then
    assertThat(reads.visibility(Kind.MATCH, first.resourceId()).orElseThrow().reasons())
        .contains(Reason.ITEM_ABSENT);
    assertThat(reads.publicMatch(first.resourceId())).isEmpty();
    assertThat(
            sql.queryForObject(
                "SELECT home_sets FROM sporting_match WHERE id=?",
                Integer.class,
                first.resourceId()))
        .isEqualTo(3);
    assertThat(acquisitionReads.match(first.resourceId())).isPresent();
  }

  @Test
  @DisplayName("Partial and failed processing cannot withdraw previously accepted identities")
  void preservesPartialPresence() {
    // Given
    UUID match =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))))
            .outcomes()
            .getFirst()
            .resourceId();

    // When
    ObservationOutcome.Calendar partial =
        calendars.accept(
            pool, new CalendarObservation(context(2), false, List.of(), List.of(), List.of()));
    ObservationOutcome.Calendar failed =
        calendars.accept(
            pool,
            new CalendarObservation(
                context(3),
                true,
                List.of(),
                List.of(),
                List.of(new CalendarObservation.Failure("row", URI.create("urn:test:failure")))));

    // Then
    assertThat(partial.absenceReconciled()).isFalse();
    assertThat(failed.absenceReconciled()).isFalse();
    assertThat(reads.publicMatch(match)).isPresent();
  }

  @Test
  @DisplayName("Wrong-season source discovery cannot withdraw another season's pool")
  void preservesOtherSeasonCatalog() {
    // Given
    UUID olderSeason = seasons.getOrCreate(2025).id();
    UUID olderPool =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.FFVB,
                    olderSeason,
                    "SYNTHETIC",
                    "COMP",
                    null,
                    null,
                    "POOL"),
                "PACK",
                "Older pool",
                new SportingClassification(DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();

    // When
    catalogs.accept(SOURCE, new CatalogObservation(context(1), true, List.of()));

    // Then
    assertThat(reads.visibility(Kind.POOL, pool).orElseThrow().reasons())
        .contains(Reason.CATALOG_ABSENT);
    assertThat(reads.visibility(Kind.POOL, olderPool).orElseThrow().viewable()).isTrue();
  }

  @Test
  @DisplayName("FFVB absence does not withdraw a professional LNV phase")
  void preservesOtherAuthority() {
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

    // When
    catalogs.accept(SOURCE, new CatalogObservation(context(1), true, List.of()));

    // Then
    assertThat(reads.visibility(Kind.POOL, professional).orElseThrow().viewable()).isTrue();
  }

  @Test
  @DisplayName("Partial catalog discovery cannot withdraw accepted pools")
  void preservesPartialCatalog() {
    // Given
    CatalogObservation observation = new CatalogObservation(context(1), false, List.of());

    // When
    ObservationOutcome.Catalog result = catalogs.accept(SOURCE, observation);

    // Then
    assertThat(result.absenceReconciled()).isFalse();
    assertThat(reads.visibility(Kind.POOL, pool).orElseThrow().viewable()).isTrue();
  }

  @Test
  @DisplayName("Detail and standings enrichment never restore calendar presence")
  void enrichmentDoesNotRestore() {
    // Given
    UUID match =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))))
            .outcomes()
            .getFirst()
            .resourceId();
    calendars.accept(pool, calendar(2, List.of()));

    // When
    matches.detail(
        new MatchObservation(
            match, context(3), candidate("M1", "Home", LocalDate.of(2026, 10, 3)).facts()));
    standings.accept(
        pool,
        new StandingsObservation(
            context(4),
            StandingsPublicationStateEnum.PUBLISHED,
            List.of("points"),
            List.of(new StandingsObservation.Row("Home", null, 1, Map.of("points", "9")))));

    // Then
    assertThat(reads.visibility(Kind.POOL, pool).orElseThrow().reasons())
        .containsExactly(Reason.CALENDAR_EMPTY);
    assertThat(reads.publicMatch(match)).isEmpty();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_participation WHERE current=TRUE", Integer.class))
        .isZero();
  }

  @Test
  @DisplayName(
      "A retained official row loses only its team link when calendar participation disappears")
  void removesStaleStandingLink() {
    // Given
    ObservationOutcome.Calendar initial =
        calendars.accept(
            pool,
            calendar(1, List.of(candidate("M1", "Home", null), candidate("M2", "Other", null))));
    standings.accept(
        pool,
        new StandingsObservation(
            context(2),
            StandingsPublicationStateEnum.PUBLISHED,
            List.of("points"),
            List.of(
                new StandingsObservation.Row("Home", null, 1, Map.of("points", "9")),
                new StandingsObservation.Row("Other", null, 2, Map.of("points", "7")),
                new StandingsObservation.Row(
                    "Unlinked official label", null, 3, Map.of("points", "3")))));
    assertThat(reads.publicStandings(pool).orElseThrow().rows().getFirst().teamId()).isNotNull();

    // When
    calendars.accept(pool, calendar(3, List.of(candidate("M2", "Other", null))));

    // Then
    List<StandingsView.Row> rows = reads.publicStandings(pool).orElseThrow().rows();
    StandingsView.Row row = rows.getFirst();
    assertThat(rows)
        .extracting(StandingsView.Row::sourceName)
        .containsExactly("Home", "Other", "Unlinked official label");
    assertThat(rows).extracting(StandingsView.Row::position).containsExactly(1, 2, 3);
    assertThat(rows.get(1).teamId()).isEqualTo(initial.outcomes().get(1).homeTeamId());
    assertThat(rows.get(2).teamId()).isNull();
    assertThat(row.sourceName()).isEqualTo("Home");
    assertThat(row.position()).isEqualTo(1);
    assertThat(row.statistics()).containsEntry("points", "9");
    assertThat(row.teamId()).isNull();
  }

  @Test
  @DisplayName("The cycle running at real F01 closure finishes once and cannot recollect afterward")
  void finishesRunningCycleAfterClosure() {
    // Given
    UUID account = UUID.fromString("00000000-0000-4000-8000-000000000186");
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email) VALUES (?,'https://identity.example.invalid/','auth0|186','Operator_186','operator@example.invalid')",
        account);
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'collection.manage')",
        account);
    UUID match =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))))
            .outcomes()
            .getFirst()
            .resourceId();
    closure.close(
        account, season, seasonReads.collectionState(season).collectionRevision(), "2026/2027");

    // When
    calendars.accept(pool, calendar(2, List.of(candidate("M1", "Home", LocalDate.of(2027, 9, 1)))));
    results.complete(cycle.id(), cycle.startedAt().plusSeconds(1));

    // Then
    assertThat(reads.publicMatch(match)).isPresent();
    assertThat(acquisitionReads.pool(pool).orElseThrow().key().seasonId()).isEqualTo(season);
    assertThatThrownBy(() -> calendars.accept(pool, calendar(3, List.of())))
        .isInstanceOf(CollectionConflictException.class);
    assertThatThrownBy(
            () ->
                cycles.admit(
                    new CollectionState.StartCycle(
                        UUID.randomUUID(), cycle.incarnationId(), CONTROL, null, 1, null)))
        .isInstanceOf(CollectionConflictException.class);
  }

  @Test
  @DisplayName("Initial empty reconstruction retains accepted history and all visibility reasons")
  void preservesHistoricalEmptyInput() {
    // Given
    UUID match =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))))
            .outcomes()
            .getFirst()
            .resourceId();
    UUID startup = UUID.randomUUID();
    runtimes.register(collectionWork.current().revision(), startup);
    UUID request = UUID.fromString("00000000-0000-4000-8000-000000000187");
    sql.update("UPDATE sporting_season SET collection_state='PREPARING' WHERE id=?", season);
    sql.update(
        "UPDATE collection_control SET enabled=FALSE,request_id=?,requested_mode='INITIAL_IMPORT' WHERE id=?",
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
    ObservationOutcome.Calendar empty = calendars.accept(pool, calendar(1, List.of()));
    catalogs.accept(SOURCE, new CatalogObservation(context(2), true, List.of()));

    // Then
    assertThat(empty.absenceReconciled()).isFalse();
    assertThat(reads.publicMatch(match)).isPresent();
    assertThat(reads.visibility(Kind.POOL, pool).orElseThrow().viewable()).isTrue();
  }

  @Test
  @DisplayName(
      "A known match returns immediately under the same identities after calendar withdrawal")
  void restoresRetainedIdentity() {
    // Given
    ObservationOutcome first =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))))
            .outcomes()
            .getFirst();
    calendars.accept(pool, calendar(2, List.of()));

    // When
    ObservationOutcome.Calendar returned =
        calendars.accept(
            pool, calendar(3, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))));

    // Then
    assertThat(returned.acceptedCount()).isEqualTo(1);
    assertThat(returned.outcomes().getFirst().resourceId()).isEqualTo(first.resourceId());
    assertThat(returned.outcomes().getFirst().homeTeamId()).isEqualTo(first.homeTeamId());
    assertThat(reads.publicMatch(first.resourceId())).isPresent();
    assertThat(reads.visibility(Kind.TEAM, first.homeTeamId()).orElseThrow().viewable()).isTrue();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("A completed empty calendar cannot apply absence twice or be undone by older work")
  void ignoresCompletedOrOlderCalendar() {
    // Given
    calendars.accept(
        pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))));
    calendars.accept(pool, calendar(3, List.of()));

    // When
    ObservationOutcome.Calendar repeated = calendars.accept(pool, calendar(3, List.of()));
    ObservationOutcome.Calendar older =
        calendars.accept(
            pool, calendar(2, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))));

    // Then
    assertThat(repeated.absenceReconciled()).isFalse();
    assertThat(older.staleCount()).isEqualTo(1);
    assertThat(reads.visibility(Kind.POOL, pool).orElseThrow().reasons())
        .containsExactly(Reason.CALENDAR_EMPTY);
  }

  @Test
  @DisplayName("A collection pause keeps accepted public history visible")
  void pauseDoesNotHide() {
    // Given
    UUID account = UUID.fromString("00000000-0000-4000-8000-000000000188");
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email) VALUES (?,'https://identity.example.invalid/','auth0|188','Operator_188','pause@example.invalid')",
        account);
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'collection.manage')",
        account);
    UUID match =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 1)))))
            .outcomes()
            .getFirst()
            .resourceId();
    long revision =
        sql.queryForObject(
            "SELECT revision FROM collection_control WHERE id=?", Long.class, CONTROL);

    // When
    controls.setActivity(account, CONTROL, revision, false);

    // Then
    assertThat(reads.publicMatch(match)).isPresent();
    assertThat(reads.visibility(Kind.POOL, pool).orElseThrow().viewable()).isTrue();
  }

  @Test
  @DisplayName("Dateless matches remain retained while public hydration requires a known date")
  void keepsDatelessMatchPrivate() {
    // Given
    UUID match =
        calendars
            .accept(pool, calendar(1, List.of(candidate("M1", "Home", null))))
            .outcomes()
            .getFirst()
            .resourceId();

    // When
    Optional<MatchView> publicMatch = reads.publicMatch(match);

    // Then
    assertThat(publicMatch).isEmpty();
    assertThat(reads.visibility(Kind.MATCH, match).orElseThrow().reasons())
        .containsExactly(Reason.DATE_UNKNOWN);
    assertThat(acquisitionReads.match(match)).isPresent();
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
