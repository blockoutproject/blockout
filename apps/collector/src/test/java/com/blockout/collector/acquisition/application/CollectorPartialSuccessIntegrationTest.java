package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.ffvb.FfvbCalendarParser;
import com.blockout.collector.acquisition.ffvb.FfvbPage;
import com.blockout.collector.acquisition.ffvb.FfvbScope;
import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendClient;
import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendMapperImpl;
import com.blockout.collector.acquisition.infrastructure.backend.SportingObservationClient;
import com.blockout.collector.acquisition.infrastructure.backend.SportingObservationMapperImpl;
import com.blockout.collector.generated.ingestion.api.CollectionApi;
import com.blockout.collector.generated.ingestion.api.CollectorOperationsApi;
import com.blockout.collector.generated.ingestion.api.SportingApi;
import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.collector.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.StandingsPublicationStateEnum;
import com.blockout.collector.ingestion.IngestionTestClient;
import java.net.URI;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.datasource.init.ScriptUtils;

/**
 * F01 T032 partial-success and absence qualification through production collector clients and the
 * executable backend. Only supplier interpretation/discovery is synthetic; all owner transactions
 * and persisted outcomes use the explicitly selected disposable migrated PostgreSQL database.
 */
@EnabledIfSystemProperty(named = "blockout.qualify-collector-sporting", matches = "true")
@DisplayName("Collector partial success and qualified sporting absence")
class CollectorPartialSuccessIntegrationTest {
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000192");
  private static final UUID POOL = UUID.fromString("00000000-0000-4000-8000-000000000195");
  private static final UUID SOURCE = UUID.fromString("00000000-0000-4000-8000-000000000196");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000197");
  private static final UUID OTHER_POOL = UUID.fromString("00000000-0000-4000-8000-000000194001");
  private static final Instant NOW = Instant.parse("2026-10-24T12:00:00Z");
  private static final LocalDate ORIGINAL_DATE = LocalDate.of(2026, 10, 24);
  private static CollectorSportingRuntime runtime;
  private final List<String> writes = new CopyOnWriteArrayList<>();
  private IngestionTestClient transport;
  private CollectionBackend backend;
  private SportingBackend sporting;
  private CollectorLifecycle lifecycle;

  /**
   * Starts the supplied backend JAR and the suite-owned local signing endpoint.
   *
   * @throws Exception if the selected local runtime cannot start
   */
  @BeforeAll
  static void startBackend() throws Exception {
    runtime = new CollectorSportingRuntime();
  }

  /**
   * Stops only this suite's backend process and signing endpoint.
   *
   * @throws Exception if owned runtime shutdown fails
   */
  @AfterAll
  static void stopBackend() throws Exception {
    if (runtime != null) runtime.close();
  }

  /**
   * Resets the disposable database and composes real generated collector consumers.
   *
   * @throws Exception if fixture initialization or client setup fails
   */
  @BeforeEach
  void connect() throws Exception {
    try (Connection connection = migrationConnection()) {
      ScriptUtils.executeSqlScript(connection, new ClassPathResource("collector-sporting.sql"));
    }
    transport =
        runtime.connect(
            (request, body, execution) -> {
              if (request.getMethod() == HttpMethod.POST) writes.add(request.getURI().getPath());
              return execution.execute(request, body);
            });
    backend =
        new CollectionBackendClient(
            new CollectorOperationsApi(transport.api()),
            new CollectionApi(transport.api()),
            new CollectionBackendMapperImpl());
    sporting =
        new SportingObservationClient(
            new SportingApi(transport.api()), new SportingObservationMapperImpl());
    lifecycle = new CollectorLifecycle(backend);
    lifecycle.start();
  }

  /**
   * Releases the test-owned native HTTP connection pool.
   *
   * @throws Exception if the owned connection pool cannot close
   */
  @AfterEach
  void closeTransport() throws Exception {
    if (transport != null) transport.close();
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName(
      "A failed acquired or integrated item retains 99 commits without withdrawing absences")
  void retainsNinetyNineCommits(boolean acquisitionFailure) {
    // Given
    // The shared HTTP test peer defaults to two seconds; this case awaits 100 real transactions.
    transport.factory().setReadTimeout(Duration.ofSeconds(15));
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    sporting.calendar(
        POOL,
        context(cycle),
        complete(match("M100", ORIGINAL_DATE), match("RETAINED", ORIGINAL_DATE)));
    List<SportingObservation.Match> matches = new ArrayList<>();
    for (int index = 1; index < 100; index++)
      matches.add(match("M" + index, ORIGINAL_DATE.plusDays(1)));
    List<SportingObservation.Failure> failures = List.of();
    if (acquisitionFailure) {
      failures =
          List.of(
              new SportingObservation.Failure(
                  "M100", URI.create("https://blockout.app/problems/invalid-source-row")));
    } else {
      matches.add(
          new SportingObservation.Match(
              "M100",
              new SportingObservation.Team("Unrecognized replacement", null, "000192", null),
              new SportingObservation.Team("Away", null, "000193", null),
              SportingObservation.Facts.builder()
                  .localDate(JsonNullable.of(ORIGINAL_DATE.plusDays(1)))
                  .build(),
              null));
    }
    FfvbAcquisition.Resource source = mock(FfvbAcquisition.Resource.class);
    when(source.calendar(any()))
        .thenReturn(
            new FfvbAcquisition.Read<>(
                new SportingObservation.Calendar(!acquisitionFailure, matches, List.of(), failures),
                NOW));

    // When
    boolean completed = passage(source).execute(cycle);

    // Then
    assertThat(completed).isTrue();
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(101);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_match WHERE local_date=?",
                Integer.class,
                ORIGINAL_DATE.plusDays(1)))
        .isEqualTo(99);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT local_date FROM sporting_match WHERE reference='M100'", LocalDate.class))
        .isEqualTo(ORIGINAL_DATE);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_match WHERE present=FALSE", Integer.class))
        .isZero();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT completed_read_ordinal FROM sporting_pool WHERE id=?", Long.class, POOL))
        .isEqualTo(1);
    assertThat(result(POOL, "CALENDAR", "ACQUISITION"))
        .isEqualTo(acquisitionFailure ? "PARTIAL" : "SUCCESS");
    assertThat(result(POOL, "CALENDAR", "INTEGRATION")).isEqualTo("PARTIAL");
    assertThat(
            runtime.sql.queryForMap(
                "SELECT obtained_count,rejected_count FROM collection_result WHERE scope_id=? AND stage='CALENDAR' AND phase='INTEGRATION'",
                POOL))
        .containsEntry("obtained_count", 99L)
        .containsEntry("rejected_count", 1L);
    assertThat(backend.cycle(cycle.getCycle().id()).state())
        .isEqualTo(CollectionCycleStateEnum.COMPLETED);
    assertThat(writes.stream().filter(path -> path.endsWith("/calendar-observations")).count())
        .isEqualTo(2);
  }

  @Test
  @DisplayName("Identical rows collapse while contradictory references isolate only that match")
  void isolatesContradictoryRows() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    sporting.calendar(
        POOL,
        context(cycle),
        complete(match("BAD", ORIGINAL_DATE), match("RETAINED", ORIGINAL_DATE)));
    SportingObservation.Match duplicate = match("GOOD", ORIGINAL_DATE);

    // When
    SportingObservation.CalendarOutcome outcome =
        sporting.calendar(
            POOL,
            context(cycle),
            complete(
                duplicate,
                duplicate,
                match("BAD", ORIGINAL_DATE.plusDays(1)),
                match("BAD", ORIGINAL_DATE.plusDays(2)),
                match("OTHER", ORIGINAL_DATE)));

    // Then
    assertThat(outcome.acceptedCount()).isEqualTo(2);
    assertThat(outcome.rejectedCount()).isEqualTo(1);
    assertThat(outcome.outcomes())
        .extracting(SportingObservation.Outcome::sourceReference)
        .containsExactly("GOOD", "BAD", "OTHER");
    assertThat(outcome.absenceReconciled()).isFalse();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT local_date FROM sporting_match WHERE reference='BAD'", LocalDate.class))
        .isEqualTo(ORIGINAL_DATE);
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(4);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_match WHERE present=FALSE", Integer.class))
        .isZero();
  }

  @Test
  @DisplayName("Pool calendar and standings failures preserve independent successful stages")
  void preservesIndependentStages() {
    // Given
    runtime.sql.update("UPDATE sporting_pool SET standings_url=calendar_url WHERE id=?", POOL);
    runtime.sql.update(
        """
        INSERT INTO sporting_pool(id,season_id,pack_id,provider,organizer_reference,
        competition_reference,reference,tour_reference,source_name,division_id,format,gender,
        setting_division_id,setting_format,setting_gender,calendar_url,standings_url)
        SELECT ?,season_id,pack_id,provider,organizer_reference,competition_reference,reference,
        '02',source_name,division_id,format,gender,setting_division_id,setting_format,setting_gender,
        calendar_url,standings_url FROM sporting_pool WHERE id=?
        """,
        OTHER_POOL,
        POOL);
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    sporting.calendar(POOL, context(cycle), complete(match("RETAINED", ORIGINAL_DATE)));
    sporting.standings(OTHER_POOL, context(cycle), table("Retained official row"));
    FfvbAcquisition.Resource source = mock(FfvbAcquisition.Resource.class);
    when(source.calendar(any()))
        .thenAnswer(
            call -> {
              CollectionBackend.Target target = call.getArgument(0);
              if (target.poolId().equals(POOL))
                throw new FfvbAcquisitionException("Synthetic unreadable calendar");
              return new FfvbAcquisition.Read<>(complete(match("OTHER", ORIGINAL_DATE)), NOW);
            });
    when(source.standings(any()))
        .thenAnswer(
            call -> {
              CollectionBackend.Target target = call.getArgument(0);
              if (target.poolId().equals(OTHER_POOL))
                throw new FfvbAcquisitionException("Synthetic unreadable standings");
              return new FfvbAcquisition.Read<>(table("Official unlinked row"), NOW);
            });

    // When
    boolean completed = passage(source).execute(cycle);

    // Then
    assertThat(completed).isTrue();
    assertThat(result(POOL, "CALENDAR", "ACQUISITION")).isEqualTo("FAILED");
    assertThat(result(POOL, "STANDINGS", "INTEGRATION")).isEqualTo("SUCCESS");
    assertThat(result(OTHER_POOL, "CALENDAR", "INTEGRATION")).isEqualTo("SUCCESS");
    assertThat(result(OTHER_POOL, "STANDINGS", "ACQUISITION")).isEqualTo("FAILED");
    assertThat(
            runtime.sql.queryForObject(
                "SELECT COUNT(*) FROM collection_result WHERE (scope_id=? AND stage='CALENDAR' OR scope_id=? AND stage='STANDINGS') AND phase='INTEGRATION'",
                Integer.class,
                POOL,
                OTHER_POOL))
        .isZero();
    assertThat(
            runtime.sql.queryForList(
                "SELECT reference FROM sporting_match ORDER BY reference", String.class))
        .containsExactly("OTHER", "RETAINED");
    assertThat(
            runtime.sql.queryForList(
                "SELECT source_name FROM sporting_standing_row WHERE pool_id=?",
                String.class,
                OTHER_POOL))
        .containsExactly("Retained official row");
    assertThat(
            runtime.sql.queryForObject(
                "SELECT last_success_at FROM collection_control WHERE id=?",
                Instant.class,
                CONTROL))
        .isNull();
  }

  @Test
  @DisplayName("A real row-constraint failure rolls back the entire official table replacement")
  void rollsBackStandingsReplacement() throws Exception {
    // Given
    runtime.sql.update("UPDATE sporting_pool SET standings_url=calendar_url WHERE id=?", POOL);
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    sporting.standings(POOL, context(cycle), table("Retained official row"));
    Instant retainedAt =
        runtime.sql.queryForObject(
            "SELECT table_observed_at FROM sporting_standings WHERE pool_id=?",
            Instant.class,
            POOL);
    SportingObservation.Standings replacement =
        new SportingObservation.Standings(
            StandingsPublicationStateEnum.PUBLISHED,
            List.of("Points"),
            List.of(
                new SportingObservation.Standing("New row", null, 2, Map.of("Points", "MAX")),
                new SportingObservation.Standing("Synthetic refused row", null, 1, Map.of())));
    FfvbAcquisition.Resource source = mock(FfvbAcquisition.Resource.class);
    when(source.calendar(any()))
        .thenReturn(new FfvbAcquisition.Read<>(complete(match("GOOD", ORIGINAL_DATE)), NOW));
    when(source.standings(any()))
        .thenReturn(new FfvbAcquisition.Read<>(replacement, NOW.plusSeconds(60)));
    try (Connection migration = migrationConnection();
        Statement fault = migration.createStatement()) {
      fault.execute(
          "ALTER TABLE sporting_standing_row ADD CONSTRAINT qualification_194_row CHECK (source_name <> 'Synthetic refused row')");
      try {
        // When
        boolean completed = passage(source).execute(cycle);

        // Then
        assertThat(completed).isTrue();
        assertThat(result(POOL, "STANDINGS", "ACQUISITION")).isEqualTo("SUCCESS");
        assertThat(result(POOL, "STANDINGS", "INTEGRATION")).isEqualTo("UNCONFIRMED");
        assertThat(result(POOL, "CALENDAR", "INTEGRATION")).isEqualTo("SUCCESS");
        assertThat(
                runtime.sql.queryForList(
                    "SELECT source_name FROM sporting_standing_row", String.class))
            .containsExactly("Retained official row");
        assertThat(
                runtime.sql.queryForObject(
                    "SELECT table_observed_at FROM sporting_standings WHERE pool_id=?",
                    Instant.class,
                    POOL))
            .isEqualTo(retainedAt);
        assertThat(writes.stream().filter(path -> path.endsWith("/standings-observations")).count())
            .isEqualTo(2);
      } finally {
        fault.execute("ALTER TABLE sporting_standing_row DROP CONSTRAINT qualification_194_row");
      }
    }
  }

  @Test
  @DisplayName("Official order, unknown statistics and unlinked labels survive atomic replacement")
  void preservesOfficialStandings() {
    // Given
    runtime.sql.update("UPDATE sporting_pool SET standings_url=calendar_url WHERE id=?", POOL);
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    sporting.standings(POOL, context(cycle), table("Old row"));
    SportingObservation.Standings official =
        new SportingObservation.Standings(
            StandingsPublicationStateEnum.PUBLISHED,
            List.of("Points", "Ratio"),
            List.of(
                new SportingObservation.Standing(
                    "Unlinked second", null, 2, Map.of("Ratio", "MAX")),
                new SportingObservation.Standing(
                    "Unlinked first", null, 1, Map.of("Points", "9"))));

    // When
    SportingObservation.Outcome outcome = sporting.standings(POOL, context(cycle), official);

    // Then
    assertThat(outcome.outcome()).isEqualTo(ObservationOutcomeEnum.ACCEPTED);
    assertThat(
            runtime.sql.queryForList(
                "SELECT source_name FROM sporting_standing_row ORDER BY row_index", String.class))
        .containsExactly("Unlinked second", "Unlinked first");
    assertThat(
            runtime.sql.queryForList(
                "SELECT position FROM sporting_standing_row ORDER BY row_index", Integer.class))
        .containsExactly(2, 1);
    assertThat(
            runtime.sql.queryForList(
                "SELECT value FROM sporting_standing_statistic ORDER BY label", String.class))
        .containsExactly("9", "MAX");
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_team", Integer.class))
        .isZero();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_standing_row WHERE team_id IS NOT NULL",
                Integer.class))
        .isZero();
  }

  @ParameterizedTest
  @ValueSource(strings = {"Wrong season", "Wrong pool", "Unreadable structure", "Header only"})
  @DisplayName("Unusable or incomplete supplier evidence never withdraws retained matches")
  void preservesDataAfterUnqualifiedAcquisition(String failure) throws Exception {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    sporting.calendar(POOL, context(cycle), complete(match("RETAINED", ORIGINAL_DATE)));
    String html =
        new ClassPathResource("acquisition/ffvb/calendar.html")
            .getContentAsString(StandardCharsets.UTF_8)
            .replace("ABCCS", "SYNTHETIC")
            .replace("TST", "POOL");
    String csv =
        new ClassPathResource("acquisition/ffvb/calendar.csv")
            .getContentAsString(StandardCharsets.UTF_8)
            .replace("ABCCS", "SYNTHETIC")
            .replace("TST", "POOL");
    html =
        switch (failure) {
          case "Wrong season" -> html.replace("2026/2027", "2025/2026");
          case "Wrong pool" -> html.replace("value=\"POOL\"", "value=\"OTHER\"");
          case "Unreadable structure" -> "<html><body>Synthetic error page</body></html>";
          default -> html;
        };
    if (failure.equals("Header only")) csv = csv.lines().findFirst().orElseThrow() + "\n";
    byte[] pageBytes = html.getBytes(Charset.forName("windows-1252"));
    byte[] exportBytes = csv.getBytes(Charset.forName("windows-1252"));
    FfvbAcquisition.Resource source = mock(FfvbAcquisition.Resource.class);
    when(source.calendar(any()))
        .thenAnswer(
            call -> {
              CollectionBackend.Target target = call.getArgument(0);
              FfvbScope scope =
                  new FfvbScope(
                      target.seasonLabel(),
                      target.organizerReference(),
                      target.competitionReference(),
                      target.poolReference(),
                      target.tourReference(),
                      target.groupReference());
              FfvbPage page =
                  new FfvbPage(
                      pageBytes,
                      URI.create(
                          "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?calend=COMPLET"),
                      scope);
              return new FfvbAcquisition.Read<>(
                  new FfvbCalendarParser().parse(exportBytes, page, scope), NOW);
            });

    // When
    boolean completed = passage(source).execute(cycle);

    // Then
    assertThat(completed).isTrue();
    assertThat(result(POOL, "CALENDAR", "ACQUISITION"))
        .isEqualTo(failure.equals("Header only") ? "PARTIAL" : "FAILED");
    assertThat(runtime.sql.queryForObject("SELECT present FROM sporting_match", Boolean.class))
        .isTrue();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT calendar_empty FROM sporting_pool WHERE id=?", Boolean.class, POOL))
        .isFalse();
    assertThat(writes.stream().filter(path -> path.endsWith("/calendar-observations")).count())
        .isEqualTo(failure.equals("Header only") ? 2 : 1);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT completed_read_ordinal FROM sporting_pool WHERE id=?", Long.class, POOL))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("A qualified current empty observation is successful evidence rather than a failure")
  void recordsQualifiedEmptySuccess() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    sporting.calendar(POOL, context(cycle), complete(match("RETAINED", ORIGINAL_DATE)));
    FfvbAcquisition.Resource source = mock(FfvbAcquisition.Resource.class);
    when(source.calendar(any())).thenReturn(new FfvbAcquisition.Read<>(complete(), NOW));

    // When
    boolean completed = passage(source).execute(cycle);

    // Then
    assertThat(completed).isTrue();
    assertThat(result(POOL, "CALENDAR", "ACQUISITION")).isEqualTo("SUCCESS");
    assertThat(result(POOL, "CALENDAR", "INTEGRATION")).isEqualTo("SUCCESS");
    assertThat(runtime.sql.queryForObject("SELECT present FROM sporting_match", Boolean.class))
        .isFalse();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT calendar_empty FROM sporting_pool WHERE id=?", Boolean.class, POOL))
        .isTrue();
  }

  @Test
  @DisplayName("The real backend rejects a pool outside the admitted snapshot before writing")
  void rejectsWrongBackendContext() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    sporting.calendar(POOL, context(cycle), complete(match("RETAINED", ORIGINAL_DATE)));

    // When / Then
    assertThatThrownBy(() -> sporting.calendar(OTHER_POOL, context(cycle), complete()))
        .isInstanceOfSatisfying(
            CollectionBackendFailure.class,
            failure ->
                assertThat(failure.getKind()).isEqualTo(CollectionBackendFailure.Kind.CONFLICT));
    assertThat(runtime.sql.queryForObject("SELECT present FROM sporting_match", Boolean.class))
        .isTrue();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT calendar_empty FROM sporting_pool WHERE id=?", Boolean.class, POOL))
        .isFalse();
  }

  @Test
  @DisplayName("Only a complete empty current calendar withdraws data and return reuses identities")
  void reconcilesEmptyCurrentCalendar() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    SportingObservation.Outcome first =
        sporting
            .calendar(POOL, context(cycle), complete(match("M1", ORIGINAL_DATE)))
            .outcomes()
            .getFirst();
    List<UUID> participations =
        runtime.sql.queryForList("SELECT id FROM sporting_participation ORDER BY id", UUID.class);
    SportingObservation.Calendar falseEmpty =
        new SportingObservation.Calendar(
            false,
            List.of(),
            List.of(),
            List.of(
                new SportingObservation.Failure(
                    "M1", URI.create("https://blockout.app/problems/invalid-source-row"))));

    // When
    SportingObservation.CalendarOutcome incomplete =
        sporting.calendar(POOL, context(cycle), falseEmpty);

    // Then
    assertThat(incomplete.absenceReconciled()).isFalse();
    assertThat(runtime.sql.queryForObject("SELECT present FROM sporting_match", Boolean.class))
        .isTrue();
    assertThat(sporting.calendar(POOL, context(cycle), complete()).absenceReconciled()).isTrue();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT calendar_empty FROM sporting_pool WHERE id=?", Boolean.class, POOL))
        .isTrue();
    assertThat(runtime.sql.queryForObject("SELECT present FROM sporting_match", Boolean.class))
        .isFalse();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_participation WHERE current=TRUE", Integer.class))
        .isZero();
    runtime.sql.update("UPDATE sporting_pool SET catalog_eligible=FALSE WHERE id=?", POOL);
    runtime.sql.update("UPDATE sporting_division SET active=FALSE");
    SportingObservation.Outcome returned =
        sporting
            .calendar(POOL, context(cycle), complete(match("M1", ORIGINAL_DATE)))
            .outcomes()
            .getFirst();
    assertThat(returned.resourceId()).isEqualTo(first.resourceId());
    assertThat(returned.homeTeamId()).isEqualTo(first.homeTeamId());
    assertThat(returned.awayTeamId()).isEqualTo(first.awayTeamId());
    assertThat(runtime.sql.queryForObject("SELECT present FROM sporting_match", Boolean.class))
        .isTrue();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_participation WHERE current=TRUE", Integer.class))
        .isEqualTo(2);
    assertThat(
            runtime.sql.queryForList(
                "SELECT id FROM sporting_participation ORDER BY id", UUID.class))
        .isEqualTo(participations);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT calendar_empty FROM sporting_pool WHERE id=?", Boolean.class, POOL))
        .isFalse();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT catalog_eligible FROM sporting_pool WHERE id=?", Boolean.class, POOL))
        .isFalse();
    assertThat(runtime.sql.queryForObject("SELECT active FROM sporting_division", Boolean.class))
        .isFalse();
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("A fully successful nonempty calendar withdraws only omitted retained matches")
  void reconcilesSuccessfulCalendar() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    sporting.calendar(
        POOL, context(cycle), complete(match("M1", ORIGINAL_DATE), match("M2", ORIGINAL_DATE)));

    // When
    SportingObservation.CalendarOutcome outcome =
        sporting.calendar(POOL, context(cycle), complete(match("M1", ORIGINAL_DATE)));

    // Then
    assertThat(outcome.absenceReconciled()).isTrue();
    assertThat(
            runtime.sql.queryForList(
                "SELECT reference FROM sporting_match WHERE present=TRUE", String.class))
        .containsExactly("M1");
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(2);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT calendar_empty FROM sporting_pool WHERE id=?", Boolean.class, POOL))
        .isFalse();
  }

  @Test
  @DisplayName("A backend-admitted wholly empty initial reconstruction preserves retained history")
  void preservesHistoricalEmptiness() {
    // Given
    CollectorLifecycle.AdmittedCycle previous = lifecycle.admit(CONTROL, null, 0, null);
    sporting.calendar(POOL, context(previous), complete(match("RETAINED", ORIGINAL_DATE)));
    assertThat(lifecycle.complete(previous, Instant.now())).isTrue();
    runtime.sql.update(
        "UPDATE sporting_season SET collection_state='PREPARING' WHERE id=?", SEASON);
    UUID request = UUID.fromString("00000000-0000-4000-8000-000000194002");
    runtime.sql.update(
        "UPDATE collection_control SET enabled=FALSE,request_id=?,requested_mode='INITIAL_IMPORT' WHERE id=?",
        request,
        CONTROL);
    runtime.sql.update(
        "INSERT INTO collection_request_source(control_id,source_binding_id) VALUES (?,?)",
        CONTROL,
        SOURCE);
    long revision =
        runtime.sql.queryForObject(
            "SELECT revision FROM collection_control WHERE id=?", Long.class, CONTROL);
    CollectorLifecycle.AdmittedCycle historical = lifecycle.admit(CONTROL, null, revision, request);

    // When
    SportingObservation.CalendarOutcome empty =
        sporting.calendar(POOL, context(historical), complete());

    // Then
    assertThat(empty.absenceReconciled()).isFalse();
    assertThat(runtime.sql.queryForObject("SELECT present FROM sporting_match", Boolean.class))
        .isTrue();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT calendar_empty FROM sporting_pool WHERE id=?", Boolean.class, POOL))
        .isFalse();
    assertThat(
            runtime.sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_participation WHERE current=TRUE", Integer.class))
        .isEqualTo(2);
  }

  @Test
  @DisplayName(
      "A closed-season fixture retains history and rejects new admission and completed writes")
  void preservesClosedHistory() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    sporting.calendar(POOL, context(cycle), complete(match("RETAINED", ORIGINAL_DATE)));
    assertThat(lifecycle.complete(cycle, Instant.now())).isTrue();
    runtime.sql.update("UPDATE sporting_season SET collection_state='CLOSED' WHERE id=?", SEASON);
    long revision =
        runtime.sql.queryForObject(
            "SELECT revision FROM collection_control WHERE id=?", Long.class, CONTROL);

    // When / Then
    assertThatThrownBy(() -> lifecycle.admit(CONTROL, null, revision, null))
        .isInstanceOf(CollectionBackendFailure.class);
    assertThatThrownBy(() -> sporting.calendar(POOL, context(cycle), complete()))
        .isInstanceOf(CollectionBackendFailure.class);
    assertThat(runtime.sql.queryForObject("SELECT present FROM sporting_match", Boolean.class))
        .isTrue();
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM collection_cycle", Integer.class))
        .isEqualTo(1);
  }

  /**
   * Builds the real passage with synthetic FFVB interpretation and unavailable discovery.
   *
   * @param source scenario-owned interpreted resource, never a backend double
   * @return production orchestration with actual admission, result, sporting and completion clients
   */
  private CollectPassage passage(FfvbAcquisition.Resource source) {
    FfvbAcquisition provider = mock(FfvbAcquisition.class);
    when(provider.resourceUrl(any()))
        .thenAnswer(call -> ((CollectionBackend.Target) call.getArgument(0)).url());
    when(provider.read(any())).thenReturn(source);
    DiscoverSeasonSources discovery = mock(DiscoverSeasonSources.class);
    when(discovery.catalog(any(), any(), any()))
        .thenThrow(new FfvbAcquisitionException("Synthetic unavailable discovery"));
    return new CollectPassage(
        backend,
        sporting,
        provider,
        mock(LnvAcquisition.class),
        mock(ClubSheets.class),
        mock(MunicipalGeocoder.class),
        discovery,
        lifecycle,
        Clock.systemUTC(),
        new CollectionStageMapperImpl());
  }

  /**
   * Allocates read order before each controlled observation.
   *
   * @param cycle actual backend admission
   * @return attributable collector context
   */
  private SportingObservation.Context context(CollectorLifecycle.AdmittedCycle cycle) {
    return new SportingObservation.Context(
        cycle.getCycle().id(), cycle.nextReadOrdinal(), NOW, null);
  }

  /**
   * Creates one attributable FFVB encounter with exact leading-zero club references.
   *
   * @param reference contextual native match code
   * @param date known source date
   * @return synthetic identifiable match
   */
  private SportingObservation.Match match(String reference, LocalDate date) {
    return new SportingObservation.Match(
        reference,
        new SportingObservation.Team("Home", null, "000192", null),
        new SportingObservation.Team("Away", null, "000193", null),
        SportingObservation.Facts.builder().localDate(JsonNullable.of(date)).build(),
        null);
  }

  /**
   * Supplies a positively qualified complete calendar, including explicit current emptiness.
   *
   * @param matches exact observed encounters
   * @return complete synthetic observation
   */
  private SportingObservation.Calendar complete(SportingObservation.Match... matches) {
    return new SportingObservation.Calendar(true, List.of(matches), List.of(), List.of());
  }

  /**
   * Supplies a usable unlinked official row without authorizing team creation.
   *
   * @param label exact official display name
   * @return published synthetic table
   */
  private SportingObservation.Standings table(String label) {
    return new SportingObservation.Standings(
        StandingsPublicationStateEnum.PUBLISHED,
        List.of("Points"),
        List.of(new SportingObservation.Standing(label, null, 1, Map.of("Points", "9"))));
  }

  /**
   * Reads current persisted evidence at its stable owner key.
   *
   * @param pool stable sporting scope
   * @param stage actual acquisition stage
   * @param phase acquisition or sporting integration
   * @return stored finite outcome
   */
  private String result(UUID pool, String stage, String phase) {
    return runtime.sql.queryForObject(
        "SELECT outcome FROM collection_result WHERE scope_id=? AND stage=? AND phase=?",
        String.class,
        pool,
        stage,
        phase);
  }

  /**
   * Opens the explicit disposable database's migration role for fixture/reset fault injection.
   *
   * @return caller-owned connection; the executable backend continues using its restricted role
   * @throws java.sql.SQLException when the supplied local database is unavailable
   */
  private Connection migrationConnection() throws java.sql.SQLException {
    return DriverManager.getConnection(
        System.getProperty("qualification.database-url"),
        System.getProperty("qualification.migration-user"),
        System.getProperty("qualification.migration-password"));
  }
}
