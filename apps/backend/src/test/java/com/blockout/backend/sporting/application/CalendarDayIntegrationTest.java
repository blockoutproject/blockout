package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.sporting.application.ConsultationRequest.CalendarRequest;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.support.MatchCalendarFixture;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture.Scope;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** Real Hibernate/PostgreSQL grouping preserves the accepted F02 schedule precision. */
@SpringBootTest
@Import({
  PostgresTestConfiguration.class,
  SportingIdentityFixture.class,
  MatchCalendarFixture.class
})
@DisplayName("Sporting calendar display days")
class CalendarDayIntegrationTest {
  @Autowired private MatchCalendarFixture fixtures;
  @Autowired private ReadMatchCalendar calendars;
  @Autowired private JdbcTemplate sql;
  @MockitoBean private Clock clock;
  private Scope scope;

  /** Resets only this context's disposable migrated database. */
  @BeforeEach
  void prepare() throws Exception {
    when(clock.instant()).thenReturn(Instant.parse("2026-10-25T04:00:00Z"));
    scope = fixtures.reset();
  }

  @ParameterizedTest
  @CsvSource({",UPCOMING", "PROVISIONAL,UPCOMING", "UNCONFIRMED,UPCOMING", "FINAL,COMPLETED"})
  @DisplayName("Only a definitive result classifies a future match as completed early")
  void classifiesEarlyResults(String state, CalendarCategoryEnum category) {
    // Given
    MatchView match =
        fixtures.match(
            scope.pool(),
            "FUTURE",
            LocalDate.parse("2026-10-25"),
            Instant.parse("2026-10-25T05:00:00Z"));
    sql.update(
        "UPDATE sporting_match SET result_state=?, home_sets=1, away_sets=0 WHERE id=?",
        state,
        match.id());

    // When
    ConsultationViews.Calendar page =
        calendars.read(
            new CalendarRequest(
                Kind.POOL, scope.pool(), null, category, ZoneId.of("Europe/Paris"), null));

    // Then
    assertThat(page.days()).hasSize(1);
    assertThat(page.days().getFirst().pools().getFirst().matches().getFirst().category())
        .isEqualTo(category);
  }

  @ParameterizedTest
  @CsvSource({"-21599,UPCOMING", "-21600,COMPLETED", "-21601,COMPLETED"})
  @DisplayName("Uses exactly six elapsed hours across the autumn DST transition")
  void classifiesKnownBoundary(long startOffset, CalendarCategoryEnum category) {
    // Given
    Instant now = Instant.parse("2026-10-25T04:00:00Z");
    fixtures.match(
        scope.pool(), "DST", LocalDate.parse("2026-10-25"), now.plusSeconds(startOffset));

    // When
    ConsultationViews.Calendar page =
        calendars.read(
            new CalendarRequest(
                Kind.POOL, scope.pool(), null, category, ZoneId.of("America/New_York"), null));

    // Then
    assertThat(page.days()).hasSize(1);
    assertThat(page.days().getFirst().pools().getFirst().matches().getFirst().category())
        .isEqualTo(category);
    assertThat(page.evaluatedAt().toInstant()).isEqualTo(now);
  }

  @ParameterizedTest
  @CsvSource({"-1,UPCOMING", "0,COMPLETED", "1,COMPLETED"})
  @DisplayName("Date-only classification uses the next Paris midnight in every grouping zone")
  void classifiesDateOnlyBoundary(long offset, CalendarCategoryEnum category) {
    // Given
    when(clock.instant()).thenReturn(Instant.parse("2026-10-25T23:00:00Z").plusSeconds(offset));
    fixtures.match(scope.pool(), "DATE", LocalDate.parse("2026-10-25"), null);

    // When
    ConsultationViews.Calendar page =
        calendars.read(
            new CalendarRequest(
                Kind.POOL, scope.pool(), null, category, ZoneId.of("America/New_York"), null));

    // Then
    assertThat(page.days())
        .extracting(ConsultationViews.Day::date)
        .containsExactly(LocalDate.parse("2026-10-25"));
    assertThat(page.days().getFirst().pools().getFirst().matches().getFirst().schedule().instant())
        .isNull();
  }

  @ParameterizedTest
  @CsvSource({"Europe/Paris,2026-09-20", "America/New_York,2026-09-19", "Asia/Tokyo,2026-09-20"})
  @DisplayName("Converts an established instant while preserving the sporting date alone")
  void groupsByAcceptedPrecision(String zone, LocalDate convertedDay) {
    // Given
    fixtures.match(
        scope.pool(),
        "KNOWN",
        LocalDate.parse("2026-09-20"),
        Instant.parse("2026-09-19T22:30:00Z"));
    fixtures.match(scope.pool(), "DATE", LocalDate.parse("2026-09-20"), null);
    fixtures.match(scope.pool(), "DATELESS", null, null);
    sql.update(
        "UPDATE sporting_match SET result_state='FINAL', home_sets=3, away_sets=1 WHERE local_date IS NOT NULL");

    // When
    ConsultationViews.Calendar page =
        calendars.read(
            new CalendarRequest(
                Kind.POOL,
                scope.pool(),
                null,
                CalendarCategoryEnum.COMPLETED,
                ZoneId.of(zone),
                null));

    // Then
    assertThat(page.days())
        .extracting(ConsultationViews.Day::date)
        .contains(convertedDay, LocalDate.parse("2026-09-20"));
    assertThat(
            page.days().stream()
                .flatMap(day -> day.pools().stream())
                .flatMap(pool -> pool.matches().stream()))
        .hasSize(2)
        .anySatisfy(
            match -> {
              assertThat(match.schedule().instant()).isNull();
              assertThat(match.schedule().localDate()).isEqualTo("2026-09-20");
            });
  }
}
