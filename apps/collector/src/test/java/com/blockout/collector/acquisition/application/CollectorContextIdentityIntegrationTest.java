package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendClient;
import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendMapperImpl;
import com.blockout.collector.acquisition.infrastructure.backend.SportingObservationClient;
import com.blockout.collector.acquisition.infrastructure.backend.SportingObservationMapperImpl;
import com.blockout.collector.generated.ingestion.api.CollectionApi;
import com.blockout.collector.generated.ingestion.api.CollectorOperationsApi;
import com.blockout.collector.generated.ingestion.api.SportingApi;
import com.blockout.collector.generated.ingestion.model.ContextSlotKindEnum;
import com.blockout.collector.generated.ingestion.model.ResultStateEnum;
import com.blockout.collector.generated.ingestion.model.StandingsPublicationStateEnum;
import com.blockout.collector.ingestion.IngestionTestClient;
import java.sql.Connection;
import java.sql.DriverManager;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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
import org.springframework.jdbc.datasource.init.ScriptUtils;

/**
 * F01 T032 contextual and seasonal identity evidence through generated collector clients and real
 * F01/F02 transactions. Normalized supplier facts and the retained follow are synthetic inputs; no
 * supplier, follow API, mobile presentation or production behavior is certified by this suite.
 */
@EnabledIfSystemProperty(named = "blockout.qualify-collector-sporting", matches = "true")
@DisplayName("Collector contextual identities and nonnumeric sporting evidence")
class CollectorContextIdentityIntegrationTest {
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000192");
  private static final UUID PACK = UUID.fromString("00000000-0000-4000-8000-000000000194");
  private static final UUID POOL = UUID.fromString("00000000-0000-4000-8000-000000000195");
  private static final UUID SOURCE = UUID.fromString("00000000-0000-4000-8000-000000000196");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000197");
  private static final UUID OTHER_POOL = UUID.fromString("00000000-0000-4000-8000-000000194011");
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000194012");
  private static final Instant NOW = Instant.parse("2026-10-24T12:00:00Z");
  private static CollectorSportingRuntime runtime;
  private IngestionTestClient transport;
  private SportingBackend sporting;
  private CollectorLifecycle lifecycle;

  /** Starts the existing qualification runtime with explicitly supplied disposable resources. */
  @BeforeAll
  static void startBackend() throws Exception {
    runtime = new CollectorSportingRuntime();
  }

  /** Stops only this suite's backend process and local signing endpoint. */
  @AfterAll
  static void stopBackend() throws Exception {
    if (runtime != null) runtime.close();
  }

  /** Resets synthetic sporting inputs and connects the production generated clients. */
  @BeforeEach
  void connect() throws Exception {
    try (Connection migration =
        DriverManager.getConnection(
            System.getProperty("qualification.database-url"),
            System.getProperty("qualification.migration-user"),
            System.getProperty("qualification.migration-password"))) {
      ScriptUtils.executeSqlScript(migration, new ClassPathResource("collector-sporting.sql"));
    }
    runtime.sql.update("DELETE FROM account WHERE id=?", ACCOUNT);
    transport = runtime.connect((request, body, execution) -> execution.execute(request, body));
    CollectionBackend backend =
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

  /** Releases this test's native connection pool; the next fixture clears retained follow data. */
  @AfterEach
  void closeTransport() throws Exception {
    if (transport != null) transport.close();
  }

  @Test
  @DisplayName(
      "Repeated pool and match codes retain distinct calendars with shared compatible teams")
  void preservesRepeatedContexts() {
    // Given
    runtime.sql.update(
        "UPDATE sporting_pool SET tour_reference='01',group_reference='A',standings_url=calendar_url WHERE id=?",
        POOL);
    addPool(OTHER_POOL, SEASON, PACK, "02");
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    SportingObservation.Calendar calendar =
        calendar(
            SportingObservation.Facts.builder()
                .localDate(JsonNullable.of(LocalDate.of(2026, 10, 24)))
                .build());

    // When
    SportingObservation.Outcome first =
        sporting.calendar(POOL, context(cycle), calendar).outcomes().getFirst();
    SportingObservation.Outcome second =
        sporting.calendar(OTHER_POOL, context(cycle), calendar).outcomes().getFirst();
    SportingObservation.Standings standings =
        new SportingObservation.Standings(
            StandingsPublicationStateEnum.PUBLISHED,
            List.of("Points"),
            List.of(
                new SportingObservation.Standing("Club team I", null, 1, Map.of("Points", "9"))));
    sporting.standings(POOL, context(cycle), standings);
    sporting.standings(OTHER_POOL, context(cycle), standings);

    // Then
    assertThat(second.resourceId()).isNotEqualTo(first.resourceId());
    assertThat(second.homeTeamId()).isEqualTo(first.homeTeamId());
    assertThat(second.awayTeamId()).isEqualTo(first.awayTeamId()).isNotEqualTo(first.homeTeamId());
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_club", Integer.class))
        .isEqualTo(1);
    assertThat(runtime.sql.queryForObject("SELECT reference FROM sporting_club", String.class))
        .isEqualTo("000192");
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_team", Integer.class))
        .isEqualTo(2);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_participation WHERE current=TRUE", Integer.class))
        .isEqualTo(4);
    assertThat(runtime.sql.queryForList("SELECT team_id FROM sporting_standing_row", UUID.class))
        .containsExactly(first.homeTeamId(), first.homeTeamId());
    assertThat(runtime.sql.queryForList("SELECT reference FROM sporting_match", String.class))
        .containsExactly("M1", "M1");
    assertThat(
            runtime.sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_pool WHERE reference='POOL'", Integer.class))
        .isEqualTo(2);
  }

  @Test
  @DisplayName("A new season reuses the club while teams, pools and matches remain seasonal")
  void preservesSeasonalIdentities() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    SportingObservation.Calendar calendar =
        calendar(
            SportingObservation.Facts.builder()
                .localDate(JsonNullable.of(LocalDate.of(2026, 10, 24)))
                .build());
    SportingObservation.Outcome original =
        sporting.calendar(POOL, context(cycle), calendar).outcomes().getFirst();
    runtime.sql.update(
        "INSERT INTO account(id,issuer,subject,username,email) VALUES (?,'https://identity.invalid/','synthetic-194','synthetic194','synthetic194@example.invalid')",
        ACCOUNT);
    runtime.sql.update(
        "INSERT INTO team_follow(id,account_id,team_id) VALUES (?,?,?)",
        UUID.fromString("00000000-0000-4000-8000-000000194013"),
        ACCOUNT,
        original.homeTeamId());
    UUID season = UUID.fromString("00000000-0000-4000-8000-000000194014");
    UUID pack = UUID.fromString("00000000-0000-4000-8000-000000194015");
    UUID source = UUID.fromString("00000000-0000-4000-8000-000000194016");
    UUID control = UUID.fromString("00000000-0000-4000-8000-000000194017");
    runtime.sql.update(
        "INSERT INTO sporting_season(id,start_year,label,collection_state) VALUES (?,2027,'2027/2028','ACTIVE')",
        season);
    runtime.sql.update(
        "INSERT INTO sporting_pack(id,season_id,provider,organizer_reference,reference) SELECT ?,?,provider,organizer_reference,reference FROM sporting_pack WHERE id=?",
        pack,
        season,
        PACK);
    addPool(OTHER_POOL, season, pack, "01");
    runtime.sql.update(
        "INSERT INTO collection_source_binding(id,season_id,provider,organizer_reference,accepted_url,validation_state,locked,launched) SELECT ?,?,provider,organizer_reference,accepted_url,validation_state,locked,launched FROM collection_source_binding WHERE id=?",
        source,
        season,
        SOURCE);
    runtime.sql.update(
        "INSERT INTO collection_control(id,season_id,family,enabled) VALUES (?,?,'FFVB',TRUE)",
        control,
        season);
    CollectorLifecycle.AdmittedCycle next = lifecycle.admit(control, null, 0, null);

    // When
    SportingObservation.Outcome returned =
        sporting.calendar(OTHER_POOL, context(next), calendar).outcomes().getFirst();

    // Then
    assertThat(returned.resourceId()).isNotEqualTo(original.resourceId());
    assertThat(returned.homeTeamId()).isNotEqualTo(original.homeTeamId());
    assertThat(returned.awayTeamId()).isNotEqualTo(original.awayTeamId());
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_club", Integer.class))
        .isEqualTo(1);
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_team", Integer.class))
        .isEqualTo(4);
    assertThat(
            runtime.sql.queryForObject(
                "SELECT season_id FROM sporting_team WHERE id=?",
                UUID.class,
                returned.homeTeamId()))
        .isEqualTo(season);
    assertThat(
            runtime.sql.queryForList(
                "SELECT team_id FROM team_follow WHERE account_id=?", UUID.class, ACCOUNT))
        .containsExactly(original.homeTeamId());
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_pool", Integer.class))
        .isEqualTo(2);
  }

  @ParameterizedTest
  @ValueSource(strings = {"F/P", "3/F", "3/P", "F/F", "2/F"})
  @DisplayName("Synthetic special notations preserve source meaning without numeric scores")
  void preservesSpecialNotation(String notation) {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    SportingObservation.Facts facts =
        SportingObservation.Facts.builder()
            .localDate(JsonNullable.of(LocalDate.of(2026, 10, 24)))
            .result(
                JsonNullable.of(
                    new SportingObservation.Result(
                        ResultStateEnum.UNCONFIRMED, null, null, notation)))
            .build();

    // When
    SportingObservation.CalendarOutcome outcome =
        sporting.calendar(POOL, context(cycle), calendar(facts));

    // Then
    assertThat(outcome.acceptedCount()).isEqualTo(1);
    assertThat(runtime.sql.queryForObject("SELECT special_label FROM sporting_match", String.class))
        .isEqualTo(notation);
    assertThat(runtime.sql.queryForObject("SELECT result_state FROM sporting_match", String.class))
        .isEqualTo("UNCONFIRMED");
    assertThat(runtime.sql.queryForObject("SELECT home_sets FROM sporting_match", Integer.class))
        .isNull();
    assertThat(runtime.sql.queryForObject("SELECT away_sets FROM sporting_match", Integer.class))
        .isNull();
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match_set", Integer.class))
        .isZero();
  }

  @Test
  @DisplayName("Normally absent facts and recognized slots create no fictional participants")
  void preservesUnknownFacts() {
    // Given
    CollectorLifecycle.AdmittedCycle cycle = lifecycle.admit(CONTROL, null, 0, null);
    SportingObservation.Calendar known = calendar(SportingObservation.Facts.builder().build());
    SportingObservation.Calendar withSlots =
        new SportingObservation.Calendar(
            true,
            known.matches(),
            List.of(
                new SportingObservation.ContextSlot("BYE", ContextSlotKindEnum.BYE),
                new SportingObservation.ContextSlot(
                    "QUALIFIER", ContextSlotKindEnum.UNDETERMINED_QUALIFIER)),
            List.of());

    // When
    SportingObservation.CalendarOutcome outcome =
        sporting.calendar(POOL, context(cycle), withSlots);

    // Then
    assertThat(outcome.acceptedCount()).isEqualTo(1);
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Integer.class))
        .isEqualTo(1);
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_team", Integer.class))
        .isEqualTo(2);
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_club", Integer.class))
        .isEqualTo(1);
    assertThat(runtime.sql.queryForObject("SELECT local_date FROM sporting_match", LocalDate.class))
        .isNull();
    assertThat(runtime.sql.queryForObject("SELECT local_time FROM sporting_match", String.class))
        .isNull();
    assertThat(runtime.sql.queryForObject("SELECT result_state FROM sporting_match", String.class))
        .isNull();
    assertThat(runtime.sql.queryForObject("SELECT COUNT(*) FROM sporting_match_set", Integer.class))
        .isZero();
  }

  /**
   * Adds one explicitly classified synthetic context before admission freezes its selection.
   *
   * @param id new contextual pool identity
   * @param season canonical season owner
   * @param pack same-season parent
   * @param tour published round distinguishing reused pool codes
   */
  private void addPool(UUID id, UUID season, UUID pack, String tour) {
    runtime.sql.update(
        """
        INSERT INTO sporting_pool(id,season_id,pack_id,provider,organizer_reference,
        competition_reference,reference,tour_reference,group_reference,source_name,division_id,
        format,gender,setting_division_id,setting_format,setting_gender,calendar_url,standings_url)
        SELECT ?,?,?,provider,organizer_reference,competition_reference,reference,?,'A',source_name,
        division_id,format,gender,setting_division_id,setting_format,setting_gender,calendar_url,
        calendar_url FROM sporting_pool WHERE id=?
        """,
        id,
        season,
        pack,
        tour,
        POOL);
  }

  /**
   * Supplies two distinct named FFVB teams belonging to the same exact club reference.
   *
   * @param facts scenario-owned known, unknown or special values
   * @return complete synthetic calendar with a contextual native match code
   */
  private SportingObservation.Calendar calendar(SportingObservation.Facts facts) {
    return new SportingObservation.Calendar(
        true,
        List.of(
            new SportingObservation.Match(
                "M1",
                new SportingObservation.Team("Club team I", null, "000192", null),
                new SportingObservation.Team("Club team II", null, "000192", null),
                facts,
                null)),
        List.of(),
        List.of());
  }

  /**
   * Allocates order before the synthetic supplier observation.
   *
   * @param cycle actual backend admission
   * @return original cycle and next read attribution
   */
  private SportingObservation.Context context(CollectorLifecycle.AdmittedCycle cycle) {
    return new SportingObservation.Context(
        cycle.getCycle().id(), cycle.nextReadOrdinal(), NOW, null);
  }
}
