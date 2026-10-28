package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.sporting.application.ConsultationRequest.CalendarRequest;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.infrastructure.ClubEntity;
import com.blockout.backend.sporting.infrastructure.TeamEntity;
import com.blockout.backend.sporting.support.MatchCalendarFixture;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingImageFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture.Scope;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import jakarta.persistence.EntityManagerFactory;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.hibernate.stat.EntityStatistics;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Real PostgreSQL summary hydration keeps current presentation without loading team/club images.
 */
@SpringBootTest
@Import({
  PostgresTestConfiguration.class,
  SportingIdentityFixture.class,
  MatchCalendarFixture.class
})
@DisplayName("Current match summary hydration")
class MatchSummaryIntegrationTest {
  @Autowired private MatchCalendarFixture fixtures;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private ReadSportingResources resources;
  @Autowired private ReadMatchCalendar calendars;
  @Autowired private JdbcTemplate sql;
  @Autowired private EntityManagerFactory entityManagerFactory;
  private Scope scope;
  private MatchView match;

  /** Resets the disposable migrated database and establishes one currently visible dated match. */
  @BeforeEach
  void prepare() throws Exception {
    scope = fixtures.reset();
    match = fixtures.match(scope.pool(), "FIRST", LocalDate.parse("2026-01-01"), null);
  }

  @Test
  @DisplayName("Returns effective names and artwork links without hydrating teams or clubs")
  void readsPresentationWithoutArtworkEntities() throws Exception {
    // Given
    UUID club =
        sql.queryForObject(
            "SELECT club_id FROM sporting_team WHERE id=?", UUID.class, match.homeTeamId());
    byte[] artwork = SportingImageFixture.image("png", 0x123456);
    sql.update(
        "UPDATE sporting_club SET logo=?, logo_media_type='image/png' WHERE id=?", artwork, club);
    sql.update(
        "UPDATE sporting_team SET manual_name='Current home', manual_short_name='HOME' WHERE id=?",
        match.homeTeamId());
    sql.update(
        "UPDATE sporting_team SET manual_name='Current away', logo=?, logo_media_type='image/png' WHERE id=?",
        artwork,
        match.awayTeamId());
    sql.update("UPDATE sporting_pool SET manual_name='Current pool' WHERE id=?", scope.pool());
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    boolean enabled = statistics.isStatisticsEnabled();
    statistics.setStatisticsEnabled(true);
    EntityStatistics teams = statistics.getEntityStatistics(TeamEntity.class.getName());
    EntityStatistics clubs = statistics.getEntityStatistics(ClubEntity.class.getName());
    long teamLoads = teams.getLoadCount();
    long clubLoads = clubs.getLoadCount();
    try {
      // When
      ConsultationViews.MatchSummary summary =
          resources
              .matchSummaries(Set.of(match.id()), Instant.parse("2026-01-02T12:00:00Z"))
              .get(match.id());

      // Then
      assertThat(summary.home().name()).isEqualTo("Current home");
      assertThat(summary.home().shortName()).isEqualTo("HOME");
      assertThat(summary.home().logoUrl()).isEqualTo("/clubs/" + club + "/logo");
      assertThat(summary.away().name()).isEqualTo("Current away");
      assertThat(summary.away().logoUrl()).isEqualTo("/teams/" + match.awayTeamId() + "/logo");
      assertThat(summary.pool().pool().name()).isEqualTo("Current pool");
      assertThat(teams.getLoadCount() - teamLoads).isZero();
      assertThat(clubs.getLoadCount() - clubLoads).isZero();
    } finally {
      statistics.setStatisticsEnabled(enabled);
    }
  }

  @Test
  @DisplayName("Composes complete calendar days without hydrating participant or club entities")
  void readsCalendarWithoutArtworkEntities() {
    // Given
    CalendarRequest request =
        new CalendarRequest(
            Kind.POOL,
            scope.pool(),
            null,
            CalendarCategoryEnum.COMPLETED,
            ZoneId.of("Europe/Paris"),
            null);
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    boolean enabled = statistics.isStatisticsEnabled();
    statistics.setStatisticsEnabled(true);
    EntityStatistics teams = statistics.getEntityStatistics(TeamEntity.class.getName());
    EntityStatistics clubs = statistics.getEntityStatistics(ClubEntity.class.getName());
    long teamLoads = teams.getLoadCount();
    long clubLoads = clubs.getLoadCount();
    try {
      // When
      ConsultationViews.Calendar calendar = calendars.read(request);

      // Then
      assertThat(calendar.days())
          .extracting(ConsultationViews.Day::date)
          .containsExactly(LocalDate.parse("2026-01-01"));
      assertThat(calendar.days().getFirst().pools().getFirst().matches())
          .extracting(ConsultationViews.MatchSummary::id)
          .containsExactly(match.id());
      assertThat(teams.getLoadCount() - teamLoads).isZero();
      assertThat(clubs.getLoadCount() - clubLoads).isZero();
    } finally {
      statistics.setStatisticsEnabled(enabled);
    }
  }

  @Test
  @DisplayName("Adding distinct match participants adds no per-match presentation queries")
  void keepsBatchQueryCountConstant() {
    // Given
    Instant now = Instant.parse("2026-01-02T12:00:00Z");
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    boolean enabled = statistics.isStatisticsEnabled();
    statistics.setStatisticsEnabled(true);
    try {
      long before = statistics.getPrepareStatementCount();
      resources.matchSummaries(Set.of(match.id()), now);
      long singleReads = statistics.getPrepareStatementCount() - before;
      MatchView second =
          identities.identifyMatch(
              scope.pool(),
              "SECOND",
              new TeamCandidate(null, "Second home", "00216", "Third club"),
              new TeamCandidate(null, "Second away", "00217", "Fourth club"));
      sql.update(
          "UPDATE sporting_match SET local_date='2026-01-01', schedule_observed_at='2026-01-01T12:00:00Z' WHERE id=?",
          second.id());

      // When
      before = statistics.getPrepareStatementCount();
      Map<UUID, ConsultationViews.MatchSummary> summaries =
          resources.matchSummaries(Set.of(match.id(), second.id()), now);
      long multipleReads = statistics.getPrepareStatementCount() - before;

      // Then
      assertThat(summaries).containsOnlyKeys(match.id(), second.id());
      assertThat(summaries.get(second.id()).home().name()).isEqualTo("Second home");
      assertThat(multipleReads).isEqualTo(singleReads);
    } finally {
      statistics.setStatisticsEnabled(enabled);
    }
  }
}
