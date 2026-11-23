package com.blockout.backend.sporting.application;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchResultInternalRequest;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.sporting.api.SportingObservationMapper;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.service.AcceptCalendar;
import com.blockout.backend.sporting.application.service.AcceptMatchObservation;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Real calendar/result producer, public-link reads and announcement allocation on PostgreSQL. */
@Import({PostgresTestConfiguration.class, SportingIdentityFixture.class})
@SpringBootTest
@DisplayName("Result producer announcement integration")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ResultAnnouncementIntegrationTest {
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private AdmitCollectionCycle cycles;
  @Autowired private RegisterCollectorRuntime runtimes;
  @Autowired private AcceptCalendar calendars;
  @Autowired private AcceptMatchObservation matches;
  @Autowired private SportingObservationMapper mapper;
  private SportingIngestionFixture.Scope scope;

  @BeforeEach
  void reset() throws Exception {
    SportingIngestionFixture.reset(database);
  }

  @ParameterizedTest
  @EnumSource(CollectionProviderEnum.class)
  @DisplayName("Commits a provisional score during an F08 outage and preserves its final allowance")
  void acceptsProvisionalWithoutConsumingResult(CollectionProviderEnum provider)
      throws SQLException {
    // Given
    scope = SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes, provider);
    CalendarObservation.Match scheduled =
        scheduledMatch(provider, "M1", LocalDate.of(2026, 10, 24));
    UUID matchId =
        calendars.accept(scope.pool(), calendar(1, scheduled)).outcomes().getFirst().resourceId();
    CalendarObservation provisional =
        calendar(
            2,
            withFacts(
                scheduled,
                new MatchFactsInternalRequest()
                    .result(
                        new MatchResultInternalRequest(ResultStateEnum.PROVISIONAL)
                            .homeSets(3)
                            .awaySets(1))));
    contributionReadAvailable(false);

    // When
    ObservationOutcome.Calendar outcome;
    try {
      outcome = calendars.accept(scope.pool(), provisional);
    } finally {
      contributionReadAvailable(true);
    }

    // Then
    assertThat(outcome.acceptedCount()).isEqualTo(1);
    assertThat(outcome.absenceReconciled()).isTrue();
    assertThat(
            sql.queryForMap(
                "SELECT result_state, home_sets, away_sets FROM sporting_match WHERE id=?",
                matchId))
        .containsEntry("result_state", "PROVISIONAL")
        .containsEntry("home_sets", 3)
        .containsEntry("away_sets", 1);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM match_announcement", Long.class)).isZero();

    // When the same match later receives a final result.
    matches.detail(
        new MatchObservation(
            matchId,
            context(3),
            mapper.toFacts(
                new MatchFactsInternalRequest()
                    .result(
                        new MatchResultInternalRequest(ResultStateEnum.FINAL)
                            .homeSets(3)
                            .awaySets(1)))));

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT result_composition FROM match_announcement WHERE match_id=?",
                String.class,
                matchId))
        .isEqualTo("PLAIN_RESULT");
  }

  @ParameterizedTest
  @EnumSource(CollectionProviderEnum.class)
  @DisplayName("Commits and reconciles a date-only calendar when the F08 reader fails")
  void acceptsDateWithoutContributionRead(CollectionProviderEnum provider) throws SQLException {
    // Given
    scope = SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes, provider);
    LocalDate date = LocalDate.of(2026, 10, 24);
    CalendarObservation calendar = calendar(1, scheduledMatch(provider, "M1", date));
    contributionReadAvailable(false);

    // When
    ObservationOutcome.Calendar outcome;
    try {
      outcome = calendars.accept(scope.pool(), calendar);
    } finally {
      contributionReadAvailable(true);
    }

    // Then
    assertSoftly(
        softly -> {
          softly.assertThat(outcome.acceptedCount()).isEqualTo(1);
          softly.assertThat(outcome.rejectedCount()).isZero();
          softly.assertThat(outcome.absenceReconciled()).isTrue();
          softly
              .assertThat(
                  sql.queryForObject(
                      "SELECT completed_read_ordinal FROM sporting_pool WHERE id=?",
                      Long.class,
                      scope.pool()))
              .isEqualTo(1L);
          softly
              .assertThat(
                  sql.queryForList(
                      "SELECT local_date FROM sporting_match WHERE pool_id=?",
                      LocalDate.class,
                      scope.pool()))
              .containsExactly(date);
          softly
              .assertThat(sql.queryForObject("SELECT COUNT(*) FROM match_announcement", Long.class))
              .isZero();
          softly
              .assertThat(sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class))
              .isZero();
        });
  }

  @ParameterizedTest
  @EnumSource(CollectionProviderEnum.class)
  @DisplayName(
      "Rolls back an eligible final with a failed F08 read while its dated sibling commits")
  void rollsBackRequiredContributionRead(CollectionProviderEnum provider) throws SQLException {
    // Given
    scope = SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes, provider);
    LocalDate retainedDate = LocalDate.of(2026, 10, 24);
    CalendarObservation.Match existing = scheduledMatch(provider, "M1", retainedDate);
    calendars.accept(scope.pool(), calendar(1, existing));
    CalendarObservation.Match result =
        withFacts(
            existing,
            new MatchFactsInternalRequest()
                ._localDate(LocalDate.of(2026, 10, 25))
                .result(
                    new MatchResultInternalRequest(ResultStateEnum.FINAL).homeSets(3).awaySets(1)));
    LocalDate siblingDate = LocalDate.of(2026, 10, 27);
    CalendarObservation.Match sibling = scheduledMatch(provider, "M2", siblingDate);
    contributionReadAvailable(false);

    // When
    ObservationOutcome.Calendar outcome;
    try {
      outcome = calendars.accept(scope.pool(), calendar(2, result, sibling));
    } finally {
      contributionReadAvailable(true);
    }

    // Then
    assertThat(outcome.outcomes())
        .extracting(ObservationOutcome::outcome)
        .containsExactly(ObservationOutcomeEnum.REJECTED, ObservationOutcomeEnum.ACCEPTED);
    assertThat(outcome.absenceReconciled()).isFalse();
    assertThat(
            sql.queryForList(
                "SELECT local_date FROM sporting_match WHERE pool_id=? ORDER BY reference",
                LocalDate.class,
                scope.pool()))
        .containsExactly(retainedDate, siblingDate);
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_match WHERE result_state IS NOT NULL", Long.class))
        .isZero();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM match_announcement", Long.class)).isZero();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class)).isZero();
  }

  @ParameterizedTest
  @EnumSource(CollectionProviderEnum.class)
  @DisplayName("A final forfeit without set totals consumes its fact even with no followers")
  void consumesResultWithEmptyAudience(CollectionProviderEnum provider) {
    // Given
    scope = SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes, provider);
    UUID matchId =
        calendars
            .accept(
                scope.pool(),
                calendar(1, scheduledMatch(provider, "M1", LocalDate.of(2026, 10, 24))))
            .outcomes()
            .getFirst()
            .resourceId();
    MatchObservation observation =
        new MatchObservation(
            matchId,
            context(2),
            mapper.toFacts(
                new MatchFactsInternalRequest()
                    .result(
                        new MatchResultInternalRequest(ResultStateEnum.FINAL).specialLabel("F"))));

    // When
    matches.detail(observation);

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT special_label FROM sporting_match WHERE id=? AND result_state='FINAL'",
                String.class,
                matchId))
        .isEqualTo("F");
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM match_announcement WHERE match_id=? AND result_processed=TRUE",
                Long.class,
                matchId))
        .isEqualTo(1);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class)).isZero();
  }

  private void contributionReadAvailable(boolean available) throws SQLException {
    try (Connection connection =
            DriverManager.getConnection(
                database.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement fixture = connection.createStatement()) {
      fixture.execute(
          available
              ? "GRANT SELECT ON contribution_version TO blockout_app"
              : "REVOKE SELECT ON contribution_version FROM blockout_app");
    }
  }

  private CalendarObservation.Match scheduledMatch(
      CollectionProviderEnum provider, String reference, LocalDate date) {
    return switch (provider) {
      case FFVB -> candidate(reference, "Home", date);
      case LNV ->
          new CalendarObservation.Match(
              reference,
              new TeamCandidate("HOME", "Professional home", null, null),
              new TeamCandidate("AWAY", "Professional away", null, null),
              mapper.toFacts(new MatchFactsInternalRequest()._localDate(date)),
              null);
    };
  }

  private CalendarObservation.Match withFacts(
      CalendarObservation.Match match, MatchFactsInternalRequest facts) {
    return new CalendarObservation.Match(
        match.nativeMatchReference(),
        match.home(),
        match.away(),
        mapper.toFacts(facts),
        match.detailUrl());
  }

  private CalendarObservation calendar(long ordinal, CalendarObservation.Match... candidates) {
    return new CalendarObservation(
        context(ordinal), true, List.of(candidates), List.of(), List.of());
  }

  /**
   * Supplies ordered synthetic source attribution without provider access.
   *
   * @param ordinal explicit read order within the admitted cycle
   * @return original attributable context
   */
  private MatchObservation.Context context(long ordinal) {
    return new MatchObservation.Context(
        scope.cycle().id(), ordinal, Instant.parse("2026-10-24T12:00:00Z"), null);
  }
}
