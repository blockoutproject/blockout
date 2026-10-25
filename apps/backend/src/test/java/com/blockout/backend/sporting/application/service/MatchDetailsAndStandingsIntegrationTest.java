package com.blockout.backend.sporting.application.service;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.ReadCollectionWork;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.InformationSheetInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchResultInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchSetScoreInternalRequest;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.generated.ingestion.model.StandingsPublicationStateEnum;
import com.blockout.backend.sporting.api.SportingObservationMapper;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.MatchDetails;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.StandingsObservation;
import com.blockout.backend.sporting.application.model.StandingsView;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import java.net.URI;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Real admission, generated mappings, application transactions and migrated PostgreSQL state. */
@Import({PostgresTestConfiguration.class, SportingIdentityFixture.class})
@SpringBootTest
@DisplayName("Independent match facts and official tables")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class MatchDetailsAndStandingsIntegrationTest {
  @Autowired private PostgreSQLContainer database;
  private static final OffsetDateTime FIRST = OffsetDateTime.parse("2026-10-19T12:00:00Z");
  @Autowired private JdbcTemplate sql;
  @Autowired private EntityManager entityManager;
  @Autowired private EntityManagerFactory entityManagerFactory;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private AdmitCollectionCycle cycles;
  @Autowired private RegisterCollectorRuntime runtimes;
  @Autowired private ReadCollectionWork collectionWork;
  @Autowired private AcceptCalendar calendars;
  @Autowired private AcceptMatchObservation matches;
  @Autowired private AcceptStandings standings;
  @Autowired private SportingStore store;
  @Autowired private SportingObservationMapper mapper;
  private SportingIngestionFixture.Scope scope;
  private UUID matchId;

  @Test
  @DisplayName("Calendar responses distinguish newly identified matches from existing updates")
  void reportsActualMatchCreation() {
    // Given
    CalendarObservation observation =
        new CalendarObservation(
            context(2),
            true,
            List.of(
                candidate("M1", "Home", LocalDate.of(2026, 10, 20)),
                candidate("M2", "Home", LocalDate.of(2026, 10, 21))),
            List.of(),
            List.of());

    // When
    ObservationOutcome.Calendar outcome = calendars.accept(scope.pool(), observation);

    // Then
    assertThat(outcome.outcomes())
        .extracting(ObservationOutcome::created)
        .containsExactly(false, true);
  }

  /** Explicitly admits a known source and establishes one encounter through the calendar owner. */
  @BeforeEach
  void admitMatch() throws Exception {
    SportingIngestionFixture.reset(database);
    scope = SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes);
    calendars.accept(
        scope.pool(),
        new CalendarObservation(
            context(1),
            true,
            List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 19))),
            List.of(),
            List.of()));
    matchId = sql.queryForObject("SELECT id FROM sporting_match WHERE reference='M1'", UUID.class);
  }

  @ParameterizedTest
  @EnumSource(ResultStateEnum.class)
  @DisplayName("Keeps source finality without a universal winning-score threshold")
  void preservesSourceFinality(ResultStateEnum state) {
    // Given
    MatchFactsInternalRequest facts =
        new MatchFactsInternalRequest()
            .result(new MatchResultInternalRequest(state).homeSets(2).awaySets(0));

    // When
    ObservationOutcome outcome = matches.detail(detail(2, facts));

    // Then
    assertThat(outcome.outcome()).isEqualTo(ObservationOutcomeEnum.ACCEPTED);
    assertThat(details().result()).isEqualTo(new MatchObservation.Result(state, 2, 0, null));
  }

  @Test
  @DisplayName(
      "Retains compatible sets and their original provenance when a later result omits detail")
  void preservesCompatibleSets() {
    // Given
    matches.detail(
        detail(
            2,
            new MatchFactsInternalRequest()
                .result(result(1, 1))
                .sets(List.of(set(25, 20), set(20, 25)))));
    MatchDetails previous = details();

    // When
    matches.detail(
        detail(
            3, new MatchFactsInternalRequest().result(result(1, 1)).venueName("Synthetic venue")));

    // Then
    MatchDetails accepted = details();
    assertThat(accepted.sets()).isEqualTo(previous.sets());
    assertThat(accepted.setsObservedAt()).isEqualTo(previous.setsObservedAt());
    assertThat(accepted.setsPublishedAt()).isEqualTo(FIRST.toInstant());
    assertThat(accepted.resultObservedAt()).isEqualTo(context(3).observedAt());
    assertThat(accepted.resultPublishedAt()).isNull();
    assertThat(accepted.venueName()).isEqualTo("Synthetic venue");
  }

  @Test
  @DisplayName("An inconsistent new set list cannot discard a usable overall result or venue")
  void isolatesInconsistentSets() {
    // Given
    matches.detail(
        detail(2, new MatchFactsInternalRequest().result(result(1, 0)).sets(List.of(set(25, 20)))));

    // When
    matches.detail(
        detail(
            3,
            new MatchFactsInternalRequest()
                .result(result(3, 1))
                .sets(List.of(set(20, 25)))
                .venueName("New venue")));

    // Then
    assertThat(details().result().homeSets()).isEqualTo(3);
    assertThat(details().sets()).isNull();
    assertThat(details().venueName()).isEqualTo("New venue");
  }

  @Test
  @DisplayName(
      "Qualified result withdrawal removes sets and old observations cannot restore either")
  void withdrawsWithoutStaleRestoration() {
    // Given
    MatchFactsInternalRequest scored =
        new MatchFactsInternalRequest().result(result(1, 0)).sets(List.of(set(25, 20)));
    matches.detail(detail(2, scored));

    // When
    matches.detail(detail(4, new MatchFactsInternalRequest().result(null)));
    ObservationOutcome older = matches.detail(detail(3, scored));

    // Then
    assertThat(older.outcome()).isEqualTo(ObservationOutcomeEnum.STALE);
    assertThat(details().result()).isNull();
    assertThat(details().sets()).isNull();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match_set", Integer.class))
        .isZero();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("Unknown notation remains diagnostic and never becomes a zero result")
  void retainsUninterpretedNotation() {
    // Given
    matches.detail(detail(2, new MatchFactsInternalRequest().result(result(1, 0))));

    // When
    matches.detail(
        detail(
            3,
            new MatchFactsInternalRequest()
                .result(
                    new MatchResultInternalRequest(ResultStateEnum.UNCONFIRMED)
                        .specialLabel("UNINTERPRETED"))));

    // Then
    assertThat(details().result().homeSets()).isEqualTo(1);
    assertThat(details().uninterpretedResult()).isEqualTo("UNINTERPRETED");
  }

  @Test
  @DisplayName(
      "Rescheduling preserves the qualified document code and independent document freshness")
  void retainsDocumentThroughRescheduling() {
    // Given
    InformationSheetInternalRequest locator =
        new InformationSheetInternalRequest("2026/2027", "SYNTHETIC", "DOCUMENT-1");
    matches.detail(
        detail(
            2,
            new MatchFactsInternalRequest()
                .informationSheet(locator)
                .scoresheetUrl(URI.create("https://example.invalid/scoresheet.pdf"))));
    MatchDetails previous = details();

    // When
    matches.detail(
        detail(
            3,
            new MatchFactsInternalRequest()
                ._localDate(LocalDate.of(2027, 1, 3))
                .scoresheetUrl(URI.create("file:///not-a-document"))));

    // Then
    assertThat(details().informationSheet().matchCode()).isEqualTo("DOCUMENT-1");
    assertThat(details().documentsObservedAt()).isEqualTo(previous.documentsObservedAt());
    assertThat(details().scoresheetUrl()).isEqualTo(previous.scoresheetUrl());
    assertThat(
            sql.queryForObject(
                "SELECT local_date FROM sporting_match WHERE id=?", LocalDate.class, matchId))
        .isEqualTo(LocalDate.of(2027, 1, 3));
  }

  @Test
  @DisplayName("A new date match cannot replace an established professional document association")
  void preservesEstablishedProfessionalCode() {
    // Given
    matches.detail(
        detail(
            2,
            new MatchFactsInternalRequest()
                .informationSheet(
                    new InformationSheetInternalRequest("2026/2027", "AALNV", "ORIGINAL"))));
    MatchDetails previous = details();

    // When
    matches.detail(
        detail(
            3,
            new MatchFactsInternalRequest()
                ._localDate(LocalDate.of(2027, 1, 3))
                .informationSheet(
                    new InformationSheetInternalRequest("2026/2027", "AALNV", "DIFFERENT"))));

    // Then
    assertThat(details().informationSheet().matchCode()).isEqualTo("ORIGINAL");
    assertThat(details().documentsObservedAt()).isEqualTo(previous.documentsObservedAt());
  }

  @Test
  @DisplayName("Details cannot create an unknown match or restore withdrawn participation")
  void neverRestoresPresence() {
    // Given
    sql.update("UPDATE sporting_participation SET current=FALSE");

    // When
    matches.detail(detail(2, new MatchFactsInternalRequest().result(result(2, 0))));

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_participation WHERE current", Integer.class))
        .isZero();
    assertThatThrownBy(
            () ->
                matches.detail(
                    new MatchObservation(
                        UUID.fromString("00000000-0000-4000-8000-000000000999"),
                        context(3),
                        mapper.toFacts(new MatchFactsInternalRequest()))))
        .isInstanceOf(SportingResourceNotFoundException.class);
  }

  @Test
  @DisplayName(
      "Preserves official order, nonnumeric statistics and unknown rows without creating teams")
  void keepsOfficialRows() {
    // Given
    List<StandingsObservation.Row> rows =
        List.of(
            new StandingsObservation.Row("Unmatched", null, 5, Map.of("Ratio", "∞")),
            new StandingsObservation.Row("Home", null, 1, Map.of()));

    // When
    standings.accept(
        scope.pool(),
        new StandingsObservation(
            context(2), StandingsPublicationStateEnum.PUBLISHED, List.of("Ratio"), rows));

    // Then
    StandingsView accepted = table();
    assertThat(accepted.rows()).extracting(StandingsView.Row::position).containsExactly(5, 1);
    assertThat(accepted.rows().getFirst().teamId()).isNull();
    assertThat(accepted.rows().getFirst().statistics()).containsEntry("Ratio", "∞");
    assertThat(accepted.rows().get(1).teamId()).isNotNull();
    assertThat(accepted.rows().get(1).statistics()).isEmpty();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_team", Integer.class))
        .isEqualTo(2);
  }

  @Test
  @DisplayName("Reading a larger official table does not query statistics once per row")
  void boundsStandingsReads() {
    // Given
    StandingsObservation.Row first =
        new StandingsObservation.Row("Home", null, 1, Map.of("Ratio", "∞", "Played", "4"));
    standings.accept(
        scope.pool(),
        new StandingsObservation(
            context(2),
            StandingsPublicationStateEnum.PUBLISHED,
            List.of("Ratio", "Played"),
            List.of(first)));
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    boolean enabled = statistics.isStatisticsEnabled();
    statistics.setStatisticsEnabled(true);
    try {
      long before = statistics.getPrepareStatementCount();
      StandingsView single = table();
      long singleReads = statistics.getPrepareStatementCount() - before;
      List<StandingsObservation.Row> rows =
          List.of(
              first,
              new StandingsObservation.Row("Second", null, 2, Map.of("Ratio", "2.5")),
              new StandingsObservation.Row("Third", null, 3, Map.of()),
              new StandingsObservation.Row("Fourth", null, 4, Map.of("Ratio", "1.0")),
              new StandingsObservation.Row("Fifth", null, 5, Map.of("Ratio", "0.5")),
              new StandingsObservation.Row("Sixth", null, 6, Map.of("Ratio", "0.0")));
      standings.accept(
          scope.pool(),
          new StandingsObservation(
              context(3),
              StandingsPublicationStateEnum.PUBLISHED,
              List.of("Ratio", "Played"),
              rows));

      // When
      before = statistics.getPrepareStatementCount();
      StandingsView larger = table();
      long largerReads = statistics.getPrepareStatementCount() - before;

      // Then
      assertThat(larger.rows())
          .extracting(StandingsView.Row::sourceName)
          .containsExactly("Home", "Second", "Third", "Fourth", "Fifth", "Sixth");
      assertThat(larger.rows().getFirst()).isEqualTo(single.rows().getFirst());
      assertThat(larger.rows().getFirst().statistics())
          .containsExactlyInAnyOrderEntriesOf(Map.of("Ratio", "∞", "Played", "4"));
      assertThat(larger.rows().get(2).statistics()).isEmpty();
      assertThat(largerReads).isEqualTo(singleReads);
    } finally {
      statistics.setStatisticsEnabled(enabled);
    }
  }

  @Test
  @DisplayName(
      "Refreshing an identical published table preserves its rows while advancing attribution")
  void refreshesIdenticalTableWithoutReplacingRows() {
    // Given
    List<StandingsObservation.Row> rows =
        List.of(new StandingsObservation.Row("Home", null, 1, Map.of("Ratio", "∞")));
    standings.accept(
        scope.pool(),
        new StandingsObservation(
            context(2), StandingsPublicationStateEnum.PUBLISHED, List.of("Ratio"), rows));
    StandingsView previous = table();
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    boolean enabled = statistics.isStatisticsEnabled();
    statistics.setStatisticsEnabled(true);
    try {
      long inserted = statistics.getEntityInsertCount();
      long deleted = statistics.getEntityDeleteCount();

      // When
      ObservationOutcome outcome =
          standings.accept(
              scope.pool(),
              new StandingsObservation(
                  context(3), StandingsPublicationStateEnum.PUBLISHED, List.of("Ratio"), rows));

      // Then
      assertThat(outcome.outcome()).isEqualTo(ObservationOutcomeEnum.UNCHANGED);
      assertThat(statistics.getEntityInsertCount() - inserted).isZero();
      assertThat(statistics.getEntityDeleteCount() - deleted).isZero();
      StandingsView refreshed = table();
      assertThat(refreshed.rows()).isEqualTo(previous.rows());
      assertThat(refreshed.readOrdinal()).isEqualTo(3);
      assertThat(refreshed.tableObservedAt()).isEqualTo(context(3).observedAt());
      assertThat(refreshed.tablePublishedAt()).isNull();
    } finally {
      statistics.setStatisticsEnabled(enabled);
    }
  }

  @Test
  @DisplayName("Qualified non-publication preserves a retained usable table and its own freshness")
  void preservesTableOnNonPublication() {
    // Given
    standings.accept(
        scope.pool(),
        new StandingsObservation(
            context(2),
            StandingsPublicationStateEnum.PUBLISHED,
            List.of(),
            List.of(new StandingsObservation.Row("Home", null, 1, Map.of()))));
    StandingsView previous = table();

    // When
    standings.accept(
        scope.pool(),
        new StandingsObservation(
            context(3), StandingsPublicationStateEnum.NOT_PUBLISHED, List.of(), List.of()));
    ObservationOutcome stale =
        standings.accept(
            scope.pool(),
            new StandingsObservation(
                context(1), StandingsPublicationStateEnum.PUBLISHED, List.of(), List.of()));

    // Then
    assertThat(table().publicationState()).isEqualTo(StandingsPublicationStateEnum.NOT_PUBLISHED);
    assertThat(table().tableAvailable()).isTrue();
    assertThat(table().rows()).isEqualTo(previous.rows());
    assertThat(table().tableObservedAt()).isEqualTo(previous.tableObservedAt());
    assertThat(table().observedAt()).isEqualTo(context(3).observedAt());
    assertThat(stale.outcome()).isEqualTo(ObservationOutcomeEnum.STALE);
  }

  @Test
  @DisplayName("Published empty and qualified absence without a retained table remain distinct")
  void distinguishesEmptyAndAbsent() {
    // Given
    standings.accept(
        scope.pool(),
        new StandingsObservation(
            context(2), StandingsPublicationStateEnum.NOT_PUBLISHED, List.of(), List.of()));
    assertThat(table().tableAvailable()).isFalse();

    // When
    standings.accept(
        scope.pool(),
        new StandingsObservation(
            context(3), StandingsPublicationStateEnum.PUBLISHED, List.of(), List.of()));

    // Then
    assertThat(table().tableAvailable()).isTrue();
    assertThat(table().rows()).isEmpty();
  }

  @Test
  @DisplayName("A failed whole-table transaction preserves the prior table and logical order")
  void rollsBackWholeTable() {
    // Given
    standings.accept(
        scope.pool(),
        new StandingsObservation(
            context(2),
            StandingsPublicationStateEnum.PUBLISHED,
            List.of(),
            List.of(new StandingsObservation.Row("Original", null, 1, Map.of()))));
    StandingsView previous = table();
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    Throwable thrown =
        catchThrowable(
            () ->
                transaction.executeWithoutResult(
                    status -> {
                      standings.accept(
                          scope.pool(),
                          new StandingsObservation(
                              context(3),
                              StandingsPublicationStateEnum.PUBLISHED,
                              List.of(),
                              List.of()));
                      entityManager.flush();
                      throw new IllegalStateException("Synthetic failure before commit");
                    }));

    // Then
    assertThat(thrown).isInstanceOf(IllegalStateException.class);
    assertThat(table()).isEqualTo(previous);
  }

  @ParameterizedTest
  @ValueSource(strings = {"F", "P", "3/F", "3/P", "F/F", "2/F"})
  @DisplayName("Persists recognized special results without inventing numeric scores")
  void persistsSpecialResult(String notation) {
    // Given
    MatchFactsInternalRequest facts =
        new MatchFactsInternalRequest()
            .result(new MatchResultInternalRequest(ResultStateEnum.FINAL).specialLabel(notation));

    // When
    matches.detail(detail(2, facts));

    // Then
    assertThat(details().result().specialLabel()).isEqualTo(notation);
    assertThat(details().result().homeSets()).isNull();
    assertThat(details().result().awaySets()).isNull();
    assertThat(details().result().state()).isEqualTo(ResultStateEnum.FINAL);
  }

  @Test
  @DisplayName("Explicit referee withdrawal removes retained names from both state and storage")
  void withdrawsReferees() {
    // Given
    matches.detail(
        detail(2, new MatchFactsInternalRequest().referees(List.of("Synthetic official"))));

    // When
    matches.detail(detail(3, new MatchFactsInternalRequest().referees(null)));

    // Then
    assertThat(details().referees()).isNull();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match_referee", Integer.class))
        .isZero();
  }

  @Test
  @DisplayName("A later published table replaces all earlier rows and accepts an empty table")
  void replacesPublishedTable() {
    // Given
    standings.accept(
        scope.pool(),
        new StandingsObservation(
            context(2),
            StandingsPublicationStateEnum.PUBLISHED,
            List.of("Ratio"),
            List.of(new StandingsObservation.Row("Previous", null, 3, Map.of("Ratio", "∞")))));

    // When
    standings.accept(
        scope.pool(),
        new StandingsObservation(
            context(3), StandingsPublicationStateEnum.PUBLISHED, List.of(), List.of()));

    // Then
    assertThat(table().tableAvailable()).isTrue();
    assertThat(table().rows()).isEmpty();
    assertThat(table().columns()).isEmpty();
    assertThat(
            sql.queryForObject("SELECT COUNT(*) FROM sporting_standing_statistic", Integer.class))
        .isZero();
    assertThat(table().tableObservedAt()).isEqualTo(context(3).observedAt());
    assertThat(table().tablePublishedAt()).isNull();
  }

  @Test
  @DisplayName("Standings do not link or restore a withdrawn participant")
  void keepsWithdrawnRowUnlinked() {
    // Given
    sql.update("UPDATE sporting_participation SET current=FALSE");

    // When
    standings.accept(
        scope.pool(),
        new StandingsObservation(
            context(2),
            StandingsPublicationStateEnum.PUBLISHED,
            List.of(),
            List.of(new StandingsObservation.Row("Home", null, 1, Map.of()))));

    // Then
    assertThat(table().rows().getFirst().teamId()).isNull();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_participation WHERE current", Integer.class))
        .isZero();
  }

  @Test
  @DisplayName(
      "An LNV encounter accepts only its admitted authority, without FFVB sporting fallback")
  void enforcesProfessionalAuthority() {
    // Given
    UUID professionalPool =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.LNV,
                    scope.season(),
                    "LNV",
                    "CHAMP",
                    null,
                    null,
                    "PHASE"),
                "PRO",
                "Synthetic phase",
                new SportingClassification(
                    SportingIngestionFixture.DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    sql.update(
        "UPDATE sporting_pool SET calendar_url='https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=1', setting_division_id=?, setting_format='_6X6', setting_gender='MALE' WHERE id=?",
        SportingIngestionFixture.DIVISION,
        professionalPool);
    UUID source = UUID.fromString("00000000-0000-4000-8000-000000000165");
    UUID control = UUID.fromString("00000000-0000-4000-8000-000000000166");
    sql.update(
        "INSERT INTO collection_source_binding(id,season_id,provider,organizer_reference,accepted_url,validation_state,locked,launched) VALUES (?,?,'LNV','LNV','https://lnv-web.dataproject.com/', 'QUALIFIED',TRUE,TRUE)",
        source,
        scope.season());
    sql.update(
        "INSERT INTO collection_control(id,season_id,family,enabled) VALUES (?,?,'LNV',TRUE)",
        control,
        scope.season());
    CollectionState.Cycle professionalCycle =
        cycles
            .admit(
                new CollectionState.StartCycle(
                    UUID.fromString("00000000-0000-4000-8000-000000000167"),
                    collectionWork.current().incarnationId(),
                    control,
                    null,
                    0,
                    null))
            .cycle();
    MatchObservation.Context authorized =
        new MatchObservation.Context(professionalCycle.id(), 1, FIRST.toInstant(), null);
    CalendarObservation.Match professional =
        new CalendarObservation.Match(
            "LNV-M1",
            new TeamCandidate("HOME", "Professional home", null, null),
            new TeamCandidate("AWAY", "Professional away", null, null),
            mapper.toFacts(new MatchFactsInternalRequest().result(result(2, 0))),
            null);

    // When
    ObservationOutcome.Calendar accepted =
        calendars.accept(
            professionalPool,
            new CalendarObservation(authorized, true, List.of(professional), List.of(), List.of()));

    // Then
    assertThat(accepted.acceptedCount()).isEqualTo(1);
    UUID professionalMatch = accepted.outcomes().getFirst().resourceId();
    assertThatThrownBy(
            () ->
                matches.detail(
                    new MatchObservation(
                        professionalMatch,
                        context(9),
                        mapper.toFacts(new MatchFactsInternalRequest().result(result(0, 2))))))
        .isInstanceOf(CollectionConflictException.class);
    MatchDetails retained =
        new TransactionTemplate(transactions)
            .execute(status -> store.matchDetails(professionalMatch));
    assertThat(retained.result().homeSets()).isEqualTo(2);
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_team WHERE provider='LNV' AND club_id IS NOT NULL",
                Integer.class))
        .isZero();
  }

  @Test
  @DisplayName("An older qualified absence cannot replace a newer published table")
  void refusesStaleAbsence() {
    // Given
    standings.accept(
        scope.pool(),
        new StandingsObservation(
            context(3),
            StandingsPublicationStateEnum.PUBLISHED,
            List.of(),
            List.of(new StandingsObservation.Row("Current", null, 1, Map.of()))));
    StandingsView previous = table();

    // When
    ObservationOutcome outcome =
        standings.accept(
            scope.pool(),
            new StandingsObservation(
                context(2), StandingsPublicationStateEnum.NOT_PUBLISHED, List.of(), List.of()));

    // Then
    assertThat(outcome.outcome()).isEqualTo(ObservationOutcomeEnum.STALE);
    assertThat(table()).isEqualTo(previous);
  }

  /**
   * Builds chronological synthetic attribution with publication time supplied only on the first
   * enrichment.
   *
   * @param ordinal scenario read order
   * @return real cycle context
   */
  private MatchObservation.Context context(long ordinal) {
    return new MatchObservation.Context(
        scope.cycle().id(),
        ordinal,
        FIRST.plusMinutes(ordinal).toInstant(),
        ordinal == 2 ? FIRST.toInstant() : null);
  }

  /**
   * Maps generated proposals without performing the service action.
   *
   * @param ordinal scenario read order
   * @param facts supplied generated proposals
   * @return attributed application observation
   */
  private MatchObservation detail(long ordinal, MatchFactsInternalRequest facts) {
    return new MatchObservation(matchId, context(ordinal), mapper.toFacts(facts));
  }

  /**
   * Reads committed enrichment in a fresh native transaction.
   *
   * @return current independent fact groups
   */
  private MatchDetails details() {
    return new TransactionTemplate(transactions).execute(status -> store.matchDetails(matchId));
  }

  /**
   * Reads committed table state without keeping a transaction around the tested writes.
   *
   * @return current publication and retained table
   */
  private StandingsView table() {
    return new TransactionTemplate(transactions)
        .execute(status -> store.standings(scope.pool()).orElseThrow());
  }

  /**
   * Supplies explicit official finality independently from the numeric totals.
   *
   * @param home published home total
   * @param away published away total
   * @return generated result proposal
   */
  private MatchResultInternalRequest result(int home, int away) {
    return new MatchResultInternalRequest(ResultStateEnum.FINAL).homeSets(home).awaySets(away);
  }

  /**
   * Supplies played points without generating a winner or a match total.
   *
   * @param home published home points
   * @param away published away points
   * @return generated set proposal
   */
  private MatchSetScoreInternalRequest set(int home, int away) {
    return new MatchSetScoreInternalRequest(home, away);
  }
}
