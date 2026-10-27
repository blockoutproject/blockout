package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.sporting.application.ConsultationRequest.CalendarRequest;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.CatalogObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.AcceptCalendar;
import com.blockout.backend.sporting.application.service.AcceptCatalog;
import com.blockout.backend.sporting.application.service.AcceptMatchObservation;
import com.blockout.backend.sporting.application.service.ReadSportingAcquisition;
import com.blockout.backend.sporting.support.MatchCalendarFixture;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture.Scope;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Complete-day traversal through the real Spring transaction, Hibernate and migrated PostgreSQL.
 */
@SpringBootTest
@Import({
  PostgresTestConfiguration.class,
  SportingIdentityFixture.class,
  MatchCalendarFixture.class
})
@DisplayName("Complete sporting calendar traversal")
class ReadMatchCalendarIntegrationTest {
  @Autowired private MatchCalendarFixture fixtures;
  @Autowired private ReadMatchCalendar calendars;
  @Autowired private ReadSportingAcquisition acquisition;
  @Autowired private JdbcTemplate sql;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private AcceptCalendar acceptance;
  @Autowired private AcceptCatalog catalogs;
  @Autowired private AcceptMatchObservation observations;
  @MockitoSpyBean private ConsultationStore store;
  private Scope scope;
  private static final LocalDate FIRST = LocalDate.parse("2026-01-01");

  /** Resets only this context's disposable migrated database. */
  @BeforeEach
  void prepare() throws Exception {
    scope = fixtures.reset();
  }

  @ParameterizedTest
  @EnumSource(
      value = Kind.class,
      names = {"CLUB", "TEAM", "POOL"})
  @DisplayName(
      "Traverses gapped complete days without splitting a busy day or imposing a total cap")
  void readsCompleteDays(Kind kind) {
    // Given
    MatchView first = null;
    for (int index = 0; index < 150; index++) {
      MatchView match =
          fixtures.match(
              scope.pool(), "BUSY-" + index, FIRST, Instant.parse("2026-01-01T12:00:00Z"));
      if (first == null) first = match;
    }
    for (int day = 1; day < 10; day++)
      fixtures.match(scope.pool(), "DAY-" + day, FIRST.plusDays(day * 3), null);
    UUID id =
        switch (kind) {
          case CLUB -> acquisition.team(first.homeTeamId()).orElseThrow().clubId();
          case TEAM -> first.homeTeamId();
          case POOL -> scope.pool();
          default -> throw new IllegalArgumentException();
        };
    CalendarRequest request =
        new CalendarRequest(
            kind,
            id,
            kind == Kind.CLUB ? scope.season() : null,
            CalendarCategoryEnum.COMPLETED,
            ZoneId.of("Europe/Paris"),
            null);

    // When
    ConsultationViews.Calendar page = calendars.read(request);
    ConsultationViews.Calendar next =
        calendars.read(
            new CalendarRequest(
                kind,
                id,
                request.seasonId(),
                request.category(),
                request.timeZone(),
                page.nextDay()));

    // Then
    assertThat(page.days()).hasSize(7);
    assertThat(page.days())
        .extracting(ConsultationViews.Day::date)
        .isSortedAccordingTo(java.util.Comparator.reverseOrder());
    assertThat(page.nextDay()).isEqualTo(FIRST.plusDays(9));
    assertThat(next.days())
        .extracting(ConsultationViews.Day::date)
        .containsExactly(FIRST.plusDays(6), FIRST.plusDays(3), FIRST);
    assertThat(next.days().getLast().pools().getFirst().matches()).hasSize(150);
    assertThat(next.nextDay()).isNull();
  }

  @Test
  @DisplayName("Keeps equal times deterministic and places unknown times last")
  void ordersKnownAndUnknown() {
    // Given
    MatchView known =
        fixtures.match(scope.pool(), "KNOWN", FIRST, Instant.parse("2026-01-01T12:00:00Z"));
    MatchView equal =
        fixtures.match(scope.pool(), "EQUAL", FIRST, Instant.parse("2026-01-01T12:00:00Z"));
    MatchView unknown = fixtures.match(scope.pool(), "UNKNOWN", FIRST, null);
    List<UUID> expected =
        java.util.stream.Stream.of(known.id(), equal.id())
            .sorted(java.util.Comparator.comparing(UUID::toString))
            .toList();

    // When
    ConsultationViews.Calendar result = calendars.read(request(null));

    // Then
    assertThat(result.days().getFirst().pools().getFirst().matches())
        .extracting(ConsultationViews.MatchSummary::id)
        .containsExactly(expected.getFirst(), expected.getLast(), unknown.id());
  }

  @Test
  @DisplayName("A moved row can be absent until an explicit traversal restart")
  void repairsMovedRowsOnRefresh() {
    // Given
    MatchView moved = fixtures.match(scope.pool(), "MOVED", FIRST, null);
    for (int day = 1; day < 9; day++)
      fixtures.match(scope.pool(), "DAY-" + day, FIRST.plusDays(day), null);
    ConsultationViews.Calendar page = calendars.read(request(null));
    sql.update("UPDATE sporting_match SET local_date='2026-01-09' WHERE id=?", moved.id());

    // When
    ConsultationViews.Calendar continuation = calendars.read(request(page.nextDay()));
    ConsultationViews.Calendar refreshed = calendars.read(request(null));

    // Then
    assertThat(ids(continuation)).doesNotContain(moved.id());
    assertThat(ids(refreshed)).contains(moved.id());
  }

  @Test
  @DisplayName("Current hidden parents and withdrawn dates suppress retained results")
  void hidesRestrictedFacts() {
    // Given
    fixtures.match(scope.pool(), "DATELESS", null, null);
    MatchView hidden = fixtures.match(scope.pool(), "WITHDRAWN", FIRST, null);
    sql.update(
        "UPDATE sporting_match SET present=FALSE, result_state='FINAL' WHERE id=?", hidden.id());

    // When
    ConsultationViews.Calendar result = calendars.read(request(null));
    sql.update("UPDATE sporting_pool SET catalog_eligible=FALSE WHERE id=?", scope.pool());

    // Then
    assertThat(result.days()).isEmpty();
    assertThatThrownBy(() -> calendars.read(request(null)))
        .isInstanceOf(SportingResourceNotFoundException.class);
  }

  @Test
  @DisplayName(
      "One response retains its PostgreSQL repeatable-read snapshot across concurrent moves")
  void keepsOneReadSnapshot() {
    // Given: the real adapter runs; only the point of a separately committed write is controlled.
    MatchView moved = fixtures.match(scope.pool(), "MOVE", FIRST, null);
    doAnswer(
            invocation -> {
              List<LocalDate> days =
                  ((List<?>) invocation.callRealMethod())
                      .stream().map(LocalDate.class::cast).toList();
              assertThat(sql.queryForObject("SHOW transaction_isolation", String.class))
                  .isEqualTo("repeatable read");
              assertThat(sql.queryForObject("SHOW transaction_read_only", String.class))
                  .isEqualTo("on");
              TransactionTemplate concurrent = new TransactionTemplate(transactions);
              concurrent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
              concurrent.executeWithoutResult(
                  status ->
                      sql.update(
                          "UPDATE sporting_match SET local_date='2026-01-20' WHERE id=?",
                          moved.id()));
              return days;
            })
        .doCallRealMethod()
        .when(store)
        .calendarDays(any(), any());

    // When
    ConsultationViews.Calendar response = calendars.read(request(null));
    ConsultationViews.Calendar nextRead = calendars.read(request(null));

    // Then
    assertThat(response.days()).extracting(ConsultationViews.Day::date).containsExactly(FIRST);
    assertThat(ids(response)).containsExactly(moved.id());
    assertThat(nextRead.days())
        .extracting(ConsultationViews.Day::date)
        .containsExactly(LocalDate.parse("2026-01-20"));
  }

  @Test
  @DisplayName(
      "A team's calendar aggregates distinct current participations with stable pool groups")
  void aggregatesParticipations() {
    // Given
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
                    "SECOND"),
                "PACK",
                "Second phase",
                new SportingClassification(
                    com.blockout.backend.sporting.support.SportingIngestionFixture.DIVISION,
                    SportFormatEnum._6X6,
                    SportGenderEnum.MALE))
            .id();
    MatchView first = fixtures.match(scope.pool(), "FIRST", FIRST, null);
    MatchView other = fixtures.match(otherPool, "OTHER", FIRST, null);

    // When
    ConsultationViews.Calendar response =
        calendars.read(
            new CalendarRequest(
                Kind.TEAM,
                first.homeTeamId(),
                null,
                CalendarCategoryEnum.COMPLETED,
                ZoneId.of("Europe/Paris"),
                null));

    // Then
    assertThat(other.homeTeamId()).isEqualTo(first.homeTeamId());
    assertThat(ids(response))
        .containsExactlyInAnyOrder(first.id(), other.id())
        .doesNotHaveDuplicates();
    assertThat(response.days().getFirst().pools())
        .extracting(pool -> pool.poolId().toString())
        .isSorted();
  }

  @Test
  @DisplayName(
      "Actual F02 corrections omissions and withdrawals are reflected by new calendar reads")
  void projectsAcceptedChanges() {
    // Given: actual F02 calendar acceptance establishes a dated encounter.
    MatchObservation.Context initial =
        new MatchObservation.Context(
            scope.cycle().id(), 1, Instant.parse("2026-10-19T12:00:00Z"), null);
    acceptance.accept(
        scope.pool(),
        new CalendarObservation(
            initial,
            true,
            List.of(
                com.blockout.backend.sporting.support.SportingIngestionFixture.candidate(
                    "ACCEPTED", "Home", FIRST)),
            List.of(),
            List.of()));
    UUID id =
        sql.queryForObject("SELECT id FROM sporting_match WHERE reference='ACCEPTED'", UUID.class);

    // When: result changes preserve the accepted date; only explicit date withdrawal hides it.
    observations.detail(
        new MatchObservation(
            id,
            new MatchObservation.Context(
                scope.cycle().id(), 2, initial.observedAt().plusSeconds(1), null),
            new MatchObservation.Facts(
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                null,
                JsonNullable.of(
                    new MatchObservation.Result(
                        com.blockout.backend.generated.ingestion.model.ResultStateEnum.FINAL,
                        3,
                        1,
                        null)),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined())));
    ConsultationViews.Calendar accepted = calendars.read(request(null));
    observations.detail(
        new MatchObservation(
            id,
            new MatchObservation.Context(
                scope.cycle().id(), 3, initial.observedAt().plusSeconds(2), null),
            new MatchObservation.Facts(
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                null,
                JsonNullable.of(null),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined())));
    ConsultationViews.Calendar resultWithdrawn = calendars.read(request(null));
    observations.detail(
        new MatchObservation(
            id,
            new MatchObservation.Context(
                scope.cycle().id(), 4, initial.observedAt().plusSeconds(3), null),
            new MatchObservation.Facts(
                JsonNullable.of(null),
                JsonNullable.undefined(),
                null,
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined(),
                JsonNullable.undefined())));
    ConsultationViews.Calendar withdrawn = calendars.read(request(null));

    // Then
    assertThat(ids(accepted)).containsExactly(id);
    assertThat(
            accepted.days().getFirst().pools().getFirst().matches().getFirst().result().homeSets())
        .isEqualTo(3);
    assertThat(ids(resultWithdrawn)).containsExactly(id);
    assertThat(resultWithdrawn.days().getFirst().pools().getFirst().matches().getFirst().result())
        .isNull();
    assertThat(withdrawn.days()).isEmpty();
  }

  @Test
  @DisplayName(
      "Qualified source catalog absence hides retained calendar facts through the real F02 owner")
  void appliesQualifiedSourceAbsence() {
    // Given
    fixtures.match(scope.pool(), "RETAINED", FIRST, null);
    assertThat(calendars.read(request(null)).days()).hasSize(1);

    // When
    catalogs.accept(
        com.blockout.backend.sporting.support.SportingIngestionFixture.SOURCE,
        new CatalogObservation(
            new MatchObservation.Context(
                scope.cycle().id(), 2, Instant.parse("2026-10-19T12:00:00Z"), null),
            true,
            List.of()));

    // Then
    assertThatThrownBy(() -> calendars.read(request(null)))
        .isInstanceOf(SportingResourceNotFoundException.class);
  }

  /**
   * Supplies one exact completed traversal with a scenario-selected exclusive boundary.
   *
   * @param nextDay exclusive continuation, or null to restart
   * @return exact pool selection for the current synthetic scope
   */
  private CalendarRequest request(LocalDate nextDay) {
    return new CalendarRequest(
        Kind.POOL,
        scope.pool(),
        null,
        CalendarCategoryEnum.COMPLETED,
        ZoneId.of("Europe/Paris"),
        nextDay);
  }

  /**
   * Flattens only response identities to assert movement without relying on adapter internals.
   *
   * @param page complete response returned by the real application reader
   * @return ordered encounter identities across its complete groups
   */
  private List<UUID> ids(ConsultationViews.Calendar page) {
    return page.days().stream()
        .flatMap(day -> day.pools().stream())
        .flatMap(pool -> pool.matches().stream())
        .map(ConsultationViews.MatchSummary::id)
        .toList();
  }
}
