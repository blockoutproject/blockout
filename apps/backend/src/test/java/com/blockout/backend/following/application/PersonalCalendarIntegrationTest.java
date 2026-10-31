package com.blockout.backend.following.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.sporting.application.ConsultationRequest.CalendarWindow;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.service.AcceptCalendar;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.support.MatchCalendarFixture;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture.Scope;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import jakarta.persistence.EntityManagerFactory;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Real migrated PostgreSQL and F02/F03/F06 reads; only the clock and concurrent write point are
 * controlled.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({
  PostgresTestConfiguration.class,
  SportingIdentityFixture.class,
  MatchCalendarFixture.class
})
@DisplayName("Personal complete-day calendar on PostgreSQL")
class PersonalCalendarIntegrationTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000230");
  private static final LocalDate DAY = LocalDate.parse("2026-10-29");
  @Autowired private MatchCalendarFixture fixtures;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private ReadPersonalCalendar reads;
  @Autowired private FollowState states;
  @Autowired private MockMvc mvc;
  @Autowired private AcceptCalendar acceptance;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private JdbcTemplate sql;
  @Autowired private EntityManagerFactory entityManagers;
  @Autowired private PlatformTransactionManager transactions;
  @MockitoBean private Clock clock;
  @MockitoSpyBean private FollowReadStore follows;
  private Scope scope;

  /** Resets only this suite's disposable migrated sporting data and synthetic account. */
  @BeforeEach
  void prepare() throws Exception {
    when(clock.instant()).thenReturn(Instant.parse("2026-10-28T12:00:00Z"));
    scope = fixtures.reset();
    sql.update("DELETE FROM account WHERE id=?", ACCOUNT);
    sql.update(
        "INSERT INTO account(id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', 'personal-calendar', 'CalendarOwner', 'calendar@example.invalid')",
        ACCOUNT);
  }

  @Test
  @DisplayName("Union selects each match once until its last selecting follow is removed")
  void overlappingOrigins() throws Exception {
    // Given
    MatchView match = fixtures.match(scope.pool(), "UNION", DAY, null);
    follow("team", match.homeTeamId());
    follow("team", match.awayTeamId());
    follow("pool", scope.pool());

    // When / Then
    assertThat(ids(read(null))).containsExactly(match.id());
    states.replace(
        new FollowContext(
            ACCOUNT, new FollowContext.Target(FollowContext.TargetType.TEAM, match.homeTeamId())),
        false);
    assertThat(ids(read(null))).containsExactly(match.id());
    states.replace(
        new FollowContext(
            ACCOUNT, new FollowContext.Target(FollowContext.TargetType.POOL, scope.pool())),
        false);
    assertThat(ids(read(null))).containsExactly(match.id());
    states.replace(
        new FollowContext(
            ACCOUNT, new FollowContext.Target(FollowContext.TargetType.TEAM, match.awayTeamId())),
        false);
    ReadPersonalCalendar.Calendar empty = read(null);
    assertThat(ids(empty)).isEmpty();
    assertThat(empty.hasAvailableFollows()).isFalse();
    assertThat(
            sql.queryForObject(
                "SELECT present FROM sporting_match WHERE id=?", Boolean.class, match.id()))
        .isTrue();
    mvc.perform(get("/matches/" + match.id()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.match.id").value(match.id().toString()));
  }

  @ParameterizedTest
  @CsvSource({
    "team-follows,true",
    "pool-follows,true",
    "matches,true",
    "team-follows,false",
    "pool-follows,false",
    "matches,false"
  })
  @DisplayName(
      "Real personal endpoints return seasonal NotFound after qualified withdrawal, with options confirming the fallback")
  void withdrawnSeasonEndpoints(String collection, boolean remainingCatalogue) throws Exception {
    // Given
    MatchView match = fixtures.match(scope.pool(), "SEASON", DAY, null);
    follow("team", match.homeTeamId());
    follow("pool", scope.pool());
    UUID fallback = remainingCatalogue ? seasons.getOrCreate(2027).id() : null;
    if (remainingCatalogue) {
      identities.createPool(
          new PoolKey(
              CollectionProviderEnum.FFVB, fallback, "SYNTHETIC", "COMP", null, null, "NEW"),
          "PACK",
          "New catalogue pool",
          new SportingClassification(
              SportingIngestionFixture.DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE));
    }
    personal(collection, scope.season()).andExpect(status().isOk());
    mvc.perform(get("/accounts/" + ACCOUNT + "/follow-options").with(owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.defaultSeasonId").value(scope.season().toString()));

    // When: actual F02 acceptance establishes complete current absence without deleting follows.
    acceptance.accept(
        scope.pool(),
        new CalendarObservation(
            new MatchObservation.Context(scope.cycle().id(), 1, clock.instant(), null),
            true,
            List.of(),
            List.of(),
            List.of()));

    // Then
    personal(collection, scope.season())
        .andExpect(status().isNotFound())
        .andExpect(header().string("Cache-Control", "no-store"));
    ResultActions options =
        mvc.perform(get("/accounts/" + ACCOUNT + "/follow-options").with(owner()))
            .andExpect(status().isOk());
    if (remainingCatalogue) {
      options
          .andExpect(jsonPath("$.seasons.length()").value(1))
          .andExpect(jsonPath("$.defaultSeasonId").value(fallback.toString()));
    } else {
      options
          .andExpect(jsonPath("$.seasons").isEmpty())
          .andExpect(jsonPath("$.defaultSeasonId").doesNotExist());
    }
    ResultActions next = personal(collection, fallback).andExpect(status().isOk());
    if (collection.equals("matches")) {
      next.andExpect(jsonPath("$.hasAvailableFollows").value(false))
          .andExpect(jsonPath("$.calendar.days").isEmpty());
    } else next.andExpect(jsonPath("$.items").isEmpty());
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM team_follow WHERE account_id=?", Long.class, ACCOUNT))
        .isEqualTo(1L);
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM pool_follow WHERE account_id=?", Long.class, ACCOUNT))
        .isEqualTo(1L);
  }

  @Test
  @DisplayName(
      "A team selects its compatible current pools while a pool never transfers into another phase")
  void multiPoolSelection() {
    // Given
    MatchView first = fixtures.match(scope.pool(), "FIRST", DAY, null);
    UUID otherPool =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.FFVB,
                    scope.season(),
                    "SYNTHETIC",
                    "COMP",
                    null,
                    null,
                    "OTHER"),
                "PACK",
                "Other phase",
                new SportingClassification(
                    SportingIngestionFixture.DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    MatchView other = fixtures.match(otherPool, "OTHER", DAY, null);
    follow("team", first.homeTeamId());

    // When
    ReadPersonalCalendar.Calendar byTeam = read(scope.season());
    sql.update("DELETE FROM team_follow WHERE account_id=?", ACCOUNT);
    follow("pool", scope.pool());
    ReadPersonalCalendar.Calendar byPool = read(null);

    // Then
    assertThat(other.homeTeamId()).isEqualTo(first.homeTeamId());
    assertThat(ids(byTeam))
        .containsExactlyInAnyOrder(first.id(), other.id())
        .doesNotHaveDuplicates();
    assertThat(ids(byPool)).containsExactly(first.id());
  }

  @Test
  @DisplayName("The explanation is independent of category")
  void categoryIndependentAvailability() {
    // Given
    MatchView match = fixtures.match(scope.pool(), "FUTURE", DAY, null);
    follow("team", match.homeTeamId());

    // When
    ReadPersonalCalendar.Calendar completed =
        reads.read(
            ACCOUNT,
            null,
            new CalendarWindow(CalendarCategoryEnum.COMPLETED, ZoneId.of("Europe/Paris"), null));

    // Then
    assertThat(completed.hasAvailableFollows()).isTrue();
    assertThat(ids(completed)).isEmpty();
    sql.update("DELETE FROM team_follow WHERE account_id=?", ACCOUNT);
    assertThat(read(null).hasAvailableFollows()).isFalse();
  }

  @Test
  @DisplayName("Another original account's follows do not select this owner's personal matches")
  void isolatesOriginalOwner() {
    // Given
    MatchView match = fixtures.match(scope.pool(), "PRIVATE", DAY, null);
    UUID other = UUID.fromString("00000000-0000-4000-8000-000000000232");
    sql.update("DELETE FROM account WHERE id=?", other);
    sql.update(
        "INSERT INTO account(id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', 'other-calendar', 'OtherCalendar', 'other-calendar@example.invalid')",
        other);
    sql.update(
        "INSERT INTO team_follow(id, account_id, team_id) VALUES (?, ?, ?)",
        UUID.fromString("00000000-0000-4000-8000-000000000233"),
        other,
        match.homeTeamId());

    // When
    ReadPersonalCalendar.Calendar calendar = read(null);

    // Then
    assertThat(calendar.hasAvailableFollows()).isFalse();
    assertThat(ids(calendar)).isEmpty();
  }

  @Test
  @DisplayName(
      "Seasonal identities never inherit another season's follows even with matching provider references")
  void noSeasonTransfer() {
    // Given
    MatchView first = fixtures.match(scope.pool(), "SAME", DAY, null);
    UUID newer = seasons.getOrCreate(2027).id();
    UUID pool =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.FFVB, newer, "SYNTHETIC", "COMP", null, null, "POOL"),
                "PACK",
                "Synthetic pool",
                new SportingClassification(
                    SportingIngestionFixture.DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    MatchView other = fixtures.match(pool, "SAME", DAY, null);
    follow("team", first.homeTeamId());

    // When
    ReadPersonalCalendar.Calendar all = read(null);
    ReadPersonalCalendar.Calendar selected = read(newer);

    // Then
    assertThat(other.homeTeamId()).isNotEqualTo(first.homeTeamId());
    assertThat(ids(all)).containsExactly(first.id());
    assertThat(ids(selected)).isEmpty();
    assertThat(selected.hasAvailableFollows()).isFalse();
  }

  @ParameterizedTest
  @ValueSource(strings = {"Europe/Paris", "America/New_York"})
  @DisplayName(
      "Paginates seven nonempty complete days with an exclusive continuation and no busy-day cap")
  void completeDays(String zone) {
    // Given
    follow("pool", scope.pool());
    for (int day = 0; day < 10; day++)
      fixtures.match(scope.pool(), "DAY-" + day, DAY.plusDays(day * 3), null);
    for (int match = 0; match < 25; match++)
      fixtures.match(scope.pool(), "BUSY-" + match, DAY, null);
    CalendarWindow first = new CalendarWindow(CalendarCategoryEnum.UPCOMING, ZoneId.of(zone), null);

    // When
    ReadPersonalCalendar.Calendar page = reads.read(ACCOUNT, null, first);
    ReadPersonalCalendar.Calendar next =
        reads.read(
            ACCOUNT,
            null,
            new CalendarWindow(first.category(), first.timeZone(), page.calendar().nextDay()));

    // Then
    assertThat(page.calendar().days()).hasSize(7);
    assertThat(page.calendar().days().getFirst().pools().getFirst().matches()).hasSize(26);
    assertThat(page.calendar().nextDay()).isEqualTo(DAY.plusDays(18));
    assertThat(next.calendar().days())
        .extracting(ConsultationViews.Day::date)
        .containsExactly(DAY.plusDays(21), DAY.plusDays(24), DAY.plusDays(27));
    assertThat(next.calendar().nextDay()).isNull();
  }

  @ParameterizedTest
  @CsvSource({"Europe/Paris,2026-10-29", "America/New_York,2026-10-28"})
  @DisplayName("Groups reliable instants in the loading zone while unknown dates remain absent")
  void precisionAndZones(String zone, LocalDate date) {
    // Given
    MatchView timed =
        fixtures.match(scope.pool(), "TIMED", DAY, Instant.parse("2026-10-29T01:00:00Z"));
    fixtures.match(scope.pool(), "DATELESS", null, null);
    follow("pool", scope.pool());

    // When
    ReadPersonalCalendar.Calendar page =
        reads.read(
            ACCOUNT,
            null,
            new CalendarWindow(CalendarCategoryEnum.UPCOMING, ZoneId.of(zone), null));

    // Then
    assertThat(page.calendar().days())
        .extracting(ConsultationViews.Day::date)
        .containsExactly(date);
    assertThat(ids(page)).containsExactly(timed.id());
  }

  @ParameterizedTest
  @CsvSource({",UPCOMING", "PROVISIONAL,UPCOMING", "UNCONFIRMED,UPCOMING", "FINAL,COMPLETED"})
  @DisplayName("Personal selection retains F03's early definitive-result classification")
  void resultCategories(String result, CalendarCategoryEnum category) {
    // Given
    MatchView match = fixtures.match(scope.pool(), "RESULT", DAY, null);
    follow("pool", scope.pool());
    sql.update(
        "UPDATE sporting_match SET result_state=?, home_sets=1, away_sets=0, result_observed_at='2026-10-28T11:00:00Z' WHERE id=?",
        result,
        match.id());

    // When
    ReadPersonalCalendar.Calendar page =
        reads.read(ACCOUNT, null, new CalendarWindow(category, ZoneId.of("Europe/Paris"), null));

    // Then
    assertThat(ids(page)).containsExactly(match.id());
    assertThat(page.calendar().days().getFirst().pools().getFirst().matches().getFirst().category())
        .isEqualTo(category);
  }

  @Test
  @DisplayName(
      "A date-only schedule correction reuses F03 categories without inventing result or time")
  void postponedPastMatch() {
    // Given
    MatchView match = fixtures.match(scope.pool(), "POSTPONED", DAY, null);
    follow("pool", scope.pool());
    assertThat(ids(read(null))).containsExactly(match.id());
    sql.update("UPDATE sporting_match SET local_date='2026-10-20' WHERE id=?", match.id());

    // When
    ReadPersonalCalendar.Calendar completed =
        reads.read(
            ACCOUNT,
            null,
            new CalendarWindow(
                CalendarCategoryEnum.COMPLETED, ZoneId.of("America/New_York"), null));

    // Then
    assertThat(ids(read(null))).isEmpty();
    assertThat(ids(completed)).containsExactly(match.id());
    ConsultationViews.MatchSummary summary =
        completed.calendar().days().getFirst().pools().getFirst().matches().getFirst();
    assertThat(summary.result()).isNull();
    assertThat(summary.schedule().instant()).isNull();
    assertThat(summary.category()).isEqualTo(CalendarCategoryEnum.COMPLETED);
  }

  @Test
  @DisplayName(
      "Withdrawn matches remain absent despite retained results and another visible participation")
  void withdrawalOverridesResults() throws Exception {
    // Given
    acceptance.accept(
        scope.pool(),
        new CalendarObservation(
            new MatchObservation.Context(scope.cycle().id(), 1, clock.instant(), null),
            true,
            List.of(
                SportingIngestionFixture.candidate("WITHDRAWN", "Home", DAY),
                SportingIngestionFixture.candidate("REMAINING", "Other home", DAY)),
            List.of(),
            List.of()));
    UUID matchId =
        sql.queryForObject("SELECT id FROM sporting_match WHERE reference='WITHDRAWN'", UUID.class);
    UUID homeId =
        sql.queryForObject(
            "SELECT home_team_id FROM sporting_match WHERE id=?", UUID.class, matchId);
    UUID otherPool =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.FFVB,
                    scope.season(),
                    "SYNTHETIC",
                    "COMP",
                    null,
                    null,
                    "OTHER"),
                "PACK",
                "Other participation",
                new SportingClassification(
                    SportingIngestionFixture.DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    MatchView other =
        identities.identifyMatch(
            otherPool,
            "OTHER",
            new TeamCandidate(null, "Home", "000160", null),
            new TeamCandidate(null, "Away", "000161", null));
    sql.update("UPDATE sporting_match SET local_date=? WHERE id=?", DAY, other.id());
    assertThat(other.homeTeamId()).isEqualTo(homeId);
    follow("team", homeId);
    follow("pool", scope.pool());
    sql.update(
        "UPDATE sporting_match SET result_state='FINAL', home_sets=3, away_sets=0 WHERE id=?",
        matchId);

    // When
    acceptance.accept(
        scope.pool(),
        new CalendarObservation(
            new MatchObservation.Context(scope.cycle().id(), 2, clock.instant(), null),
            true,
            List.of(SportingIngestionFixture.candidate("REMAINING", "Other home", DAY)),
            List.of(),
            List.of()));
    ReadPersonalCalendar.Calendar page =
        reads.read(
            ACCOUNT,
            null,
            new CalendarWindow(CalendarCategoryEnum.COMPLETED, ZoneId.of("Europe/Paris"), null));

    // Then
    assertThat(page.hasAvailableFollows()).isTrue();
    assertThat(ids(page)).isEmpty();
    assertThat(
            sql.queryForObject(
                "SELECT result_state FROM sporting_match WHERE id=?", String.class, matchId))
        .isEqualTo("FINAL");
    mvc.perform(get("/matches/" + matchId)).andExpect(status().isNotFound());
    mvc.perform(get("/teams/" + homeId)).andExpect(status().isOk());
  }

  @ParameterizedTest
  @ValueSource(strings = {"partial", "failure", "qualified"})
  @DisplayName("Only a qualified current complete-empty observation hides the followed pool")
  void emptyObservation(String observation) {
    // Given
    MatchView match = fixtures.match(scope.pool(), "RETAINED", DAY, null);
    follow("pool", scope.pool());

    // When
    acceptance.accept(
        scope.pool(),
        new CalendarObservation(
            new MatchObservation.Context(
                scope.cycle().id(), 1, Instant.parse("2026-10-28T12:00:00Z"), null),
            !observation.equals("partial"),
            List.of(),
            List.of(),
            observation.equals("failure")
                ? List.of(
                    new CalendarObservation.Failure(
                        "synthetic", URI.create("urn:blockout:test:unavailable")))
                : List.of()));
    ReadPersonalCalendar.Calendar page = read(null);

    // Then
    assertThat(page.hasAvailableFollows()).isEqualTo(!observation.equals("qualified"));
    if (observation.equals("qualified")) assertThat(ids(page)).isEmpty();
    else assertThat(ids(page)).containsExactly(match.id());
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM pool_follow WHERE account_id=?", Long.class, ACCOUNT))
        .isEqualTo(1L);
  }

  @ParameterizedTest
  @ValueSource(strings = {"catalog", "division"})
  @DisplayName(
      "Authorized reappearance restores retained follows without lifting an independent restriction")
  void reappearance(String restriction) {
    // Given
    acceptance.accept(
        scope.pool(),
        new CalendarObservation(
            new MatchObservation.Context(scope.cycle().id(), 1, clock.instant(), null),
            true,
            List.of(SportingIngestionFixture.candidate("RETURN", "Home", DAY)),
            List.of(),
            List.of()));
    UUID original =
        sql.queryForObject("SELECT id FROM sporting_match WHERE reference='RETURN'", UUID.class);
    states.replace(
        new FollowContext(
            ACCOUNT, new FollowContext.Target(FollowContext.TargetType.POOL, scope.pool())),
        true);
    UUID relation =
        sql.queryForObject("SELECT id FROM pool_follow WHERE account_id=?", UUID.class, ACCOUNT);
    acceptance.accept(
        scope.pool(),
        new CalendarObservation(
            new MatchObservation.Context(
                scope.cycle().id(), 2, Instant.parse("2026-10-28T12:00:00Z"), null),
            true,
            List.of(),
            List.of(),
            List.of()));
    assertThat(read(null).hasAvailableFollows()).isFalse();
    if (restriction.equals("catalog"))
      sql.update("UPDATE sporting_pool SET catalog_eligible=FALSE WHERE id=?", scope.pool());
    else
      sql.update(
          "UPDATE sporting_division SET active=FALSE WHERE id=?",
          SportingIngestionFixture.DIVISION);

    // When
    acceptance.accept(
        scope.pool(),
        new CalendarObservation(
            new MatchObservation.Context(
                scope.cycle().id(), 3, Instant.parse("2026-10-28T12:00:01Z"), null),
            true,
            List.of(SportingIngestionFixture.candidate("RETURN", "Home", DAY)),
            List.of(),
            List.of()));
    // Then
    assertThat(read(null).hasAvailableFollows()).isFalse();
    assertThat(ids(read(null))).isEmpty();
    if (restriction.equals("catalog"))
      sql.update("UPDATE sporting_pool SET catalog_eligible=TRUE WHERE id=?", scope.pool());
    else
      sql.update(
          "UPDATE sporting_division SET active=TRUE WHERE id=?", SportingIngestionFixture.DIVISION);
    assertThat(read(null).hasAvailableFollows()).isTrue();
    assertThat(ids(read(null))).containsExactly(original);
    assertThat(
            sql.queryForObject(
                "SELECT id FROM pool_follow WHERE account_id=?", UUID.class, ACCOUNT))
        .isEqualTo(relation);
  }

  @Test
  @DisplayName(
      "One repeatable-read response couples flag and rows across separately committed follow and visibility changes")
  void consistentSnapshot() {
    // Given: real adapter reads; only the point of a committed concurrent write is controlled.
    MatchView match = fixtures.match(scope.pool(), "SNAPSHOT", DAY, null);
    follow("pool", scope.pool());
    doAnswer(
            invocation -> {
              Object choices = invocation.callRealMethod();
              assertThat(sql.queryForObject("SHOW transaction_isolation", String.class))
                  .isEqualTo("repeatable read");
              assertThat(sql.queryForObject("SHOW transaction_read_only", String.class))
                  .isEqualTo("on");
              TransactionTemplate concurrent = new TransactionTemplate(transactions);
              concurrent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
              concurrent.executeWithoutResult(
                  status -> {
                    sql.update("DELETE FROM pool_follow WHERE account_id=?", ACCOUNT);
                    sql.update("UPDATE sporting_match SET present=FALSE WHERE id=?", match.id());
                  });
              return choices;
            })
        .doCallRealMethod()
        .when(follows)
        .seasons(ACCOUNT);

    // When
    ReadPersonalCalendar.Calendar response = read(null);
    ReadPersonalCalendar.Calendar nextRead = read(null);

    // Then
    assertThat(response.hasAvailableFollows()).isTrue();
    assertThat(ids(response)).containsExactly(match.id());
    assertThat(nextRead.hasAvailableFollows()).isFalse();
    assertThat(ids(nextRead)).isEmpty();
  }

  @Test
  @DisplayName("Busy complete days do not add per-match presentation queries")
  void batchedPresentations() {
    // Given
    fixtures.match(scope.pool(), "FIRST", DAY, null);
    follow("pool", scope.pool());
    Statistics statistics = entityManagers.unwrap(SessionFactory.class).getStatistics();
    boolean enabled = statistics.isStatisticsEnabled();
    statistics.setStatisticsEnabled(true);
    try {
      statistics.clear();
      read(null);
      long oneMatch = statistics.getPrepareStatementCount();
      for (int index = 0; index < 24; index++) {
        MatchView match =
            identities.identifyMatch(
                scope.pool(),
                "BUSY-" + index,
                new TeamCandidate(null, "Home " + index, "00214", "Synthetic club"),
                new TeamCandidate(null, "Away " + index, "00215", "Other club"));
        sql.update("UPDATE sporting_match SET local_date=? WHERE id=?", DAY, match.id());
      }
      statistics.clear();

      // When
      ReadPersonalCalendar.Calendar busy = read(null);

      // Then
      assertThat(ids(busy)).hasSize(25);
      assertThat(statistics.getPrepareStatementCount()).isEqualTo(oneMatch);
    } finally {
      statistics.setStatisticsEnabled(enabled);
    }
  }

  @Test
  @DisplayName("Unavailable seasonal choices fail instead of falling back to the general calendar")
  void missingSeason() {
    // Given
    fixtures.match(scope.pool(), "RETAINED", DAY, null);
    follow("pool", scope.pool());
    UUID absent = UUID.fromString("00000000-0000-4000-8000-000000000231");

    // When / Then
    assertThatThrownBy(() -> read(absent)).isInstanceOf(FollowUnavailableTargetException.class);
  }

  @Test
  @DisplayName("A missing original lifecycle never resolves a replacement account")
  void missingOriginalAccount() {
    // Given
    UUID absent = UUID.fromString("00000000-0000-4000-8000-000000000231");

    // When / Then
    assertThatThrownBy(
            () ->
                reads.read(
                    absent,
                    null,
                    new CalendarWindow(
                        CalendarCategoryEnum.UPCOMING, ZoneId.of("Europe/Paris"), null)))
        .isInstanceOf(AccountNotFoundException.class);
  }

  /**
   * Calls the production generated personal collection with real security, ownership and SQL reads.
   *
   * @param collection canonical collection suffix
   * @param season optional sporting season; null leaves the query absent for All seasons
   * @return HTTP result for explicit scenario assertions
   * @throws Exception when MVC dispatch fails
   */
  private ResultActions personal(String collection, UUID season) throws Exception {
    org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request =
        get("/accounts/" + ACCOUNT + "/" + collection).with(owner());
    if (season != null) request.param("seasonId", season.toString());
    if (collection.equals("matches"))
      request.param("category", "upcoming").param("timeZone", "Europe/Paris");
    return mvc.perform(request);
  }

  /**
   * Supplies a validated synthetic principal; current account and admission still read PostgreSQL.
   */
  private RequestPostProcessor owner() {
    return jwt()
        .jwt(
            token ->
                token
                    .issuer("https://identity.example.invalid/")
                    .subject("personal-calendar")
                    .claim("azp", "mobile-test"));
  }

  /**
   * Selects one synthetic owner's upcoming calendar.
   *
   * @param seasonId optional sporting selection
   * @return current F06 envelope from the actual SQL/F03 composition
   */
  private ReadPersonalCalendar.Calendar read(UUID seasonId) {
    return reads.read(
        ACCOUNT,
        seasonId,
        new CalendarWindow(CalendarCategoryEnum.UPCOMING, ZoneId.of("Europe/Paris"), null));
  }

  /**
   * Persists one explicitly typed original-account relation in this suite's disposable database.
   *
   * @param type association table kind
   * @param target exact sporting UUID
   */
  private void follow(String type, UUID target) {
    sql.update(
        "INSERT INTO " + type + "_follow(id, account_id, " + type + "_id) VALUES (?, ?, ?)",
        UUID.nameUUIDFromBytes((type + ":" + target).getBytes(StandardCharsets.UTF_8)),
        ACCOUNT,
        target);
  }

  /**
   * Extracts identities without obscuring mutations or the tested read.
   *
   * @param response accepted F06 envelope
   * @return selected match identities in traversal order
   */
  private List<UUID> ids(ReadPersonalCalendar.Calendar response) {
    return response.calendar().days().stream()
        .flatMap(day -> day.pools().stream())
        .flatMap(pool -> pool.matches().stream())
        .map(ConsultationViews.MatchSummary::id)
        .toList();
  }
}
