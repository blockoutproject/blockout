package com.blockout.backend.sporting.application;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.collection.application.service.CollectorRuntimeService;
import com.blockout.backend.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchResultInternalRequest;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.sporting.api.SportingObservationMapper;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.service.CalendarAcceptanceService;
import com.blockout.backend.sporting.application.service.MatchAcceptanceService;
import com.blockout.backend.sporting.application.service.SeasonService;
import com.blockout.backend.sporting.application.service.SportingIdentityService;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Real calendar/result producer, F06 recipients and F07 persistence on migrated PostgreSQL. */
@SpringBootTest
@Testcontainers
@DisplayName("Result producer announcement integration")
class ResultAnnouncementIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  @Autowired private JdbcTemplate sql;
  @Autowired private SeasonService seasons;
  @Autowired private SportingIdentityService identities;
  @Autowired private CollectionCycleService cycles;
  @Autowired private CollectorRuntimeService runtimes;
  @Autowired private CalendarAcceptanceService calendars;
  @Autowired private MatchAcceptanceService matches;
  @Autowired private SportingObservationMapper mapper;
  private SportingIngestionFixture.Scope scope;
  private UUID matchId;

  /** Migrates this disposable database before Hibernate validation. */
  @DynamicPropertySource
  static void database(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /** Establishes an actual admitted sporting encounter with no final result. */
  @BeforeEach
  void establishMatch() throws Exception {
    SportingIngestionFixture.reset(DATABASE);
    scope = SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes);
    calendars.accept(
        scope.pool(),
        new CalendarObservation(
            context(1),
            true,
            List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 24))),
            List.of(),
            List.of()));
    matchId = sql.queryForObject("SELECT id FROM sporting_match WHERE reference='M1'", UUID.class);
  }

  @Test
  @DisplayName("Accepting a final result consumes its fact even with no followers")
  void consumesResultWithEmptyAudience() {
    // Given
    MatchObservation observation =
        new MatchObservation(
            matchId,
            context(2),
            mapper.toFacts(
                new MatchFactsInternalRequest()
                    .result(
                        new MatchResultInternalRequest(ResultStateEnum.FINAL)
                            .homeSets(3)
                            .awaySets(1))));

    // When
    matches.detail(observation);

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM match_announcement WHERE match_id=? AND result_processed=TRUE",
                Long.class,
                matchId))
        .isEqualTo(1);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class)).isZero();
  }

  /** Supplies ordered synthetic source attribution without provider access. */
  private MatchObservation.Context context(long ordinal) {
    return new MatchObservation.Context(
        scope.cycle().id(), ordinal, OffsetDateTime.parse("2026-10-24T12:00:00Z"), null);
  }
}
