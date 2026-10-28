package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.generated.mobile.model.StandingsAvailabilityEnum;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture.Scope;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Real F02 identities and migrated SQL with synthetic accepted table/acquisition evidence. */
@SpringBootTest
@Import({PostgresTestConfiguration.class, SportingIdentityFixture.class})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Independent official standings and pool participants")
class PoolConsultationIntegrationTest {
  private static final OffsetDateTime OBSERVED = OffsetDateTime.parse("2026-10-20T12:00:00Z");
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private ReadSportingResources resources;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private AdmitCollectionCycle cycles;
  @Autowired private RegisterCollectorRuntime runtimes;
  private Scope scope;
  private MatchView match;

  /**
   * Creates actual participants independently of tables; SQL supplies explicitly accepted facts.
   */
  @BeforeEach
  void prepareParticipants() throws Exception {
    SportingIngestionFixture.reset(database);
    sql.update("DELETE FROM collection_control");
    scope = SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes);
    match =
        identities.identifyMatch(
            scope.pool(),
            "POOL-READ",
            new TeamCandidate(null, "Zulu", "00209", "Club Z"),
            new TeamCandidate(null, "Alpha", "00210", "Club A"));
  }

  @Test
  @DisplayName("Participants remain usable before any official table exists")
  void readsParticipantsWithoutStandings() {
    // Given: no accepted table or acquisition attempt exists.

    // When
    ConsultationViews.Standings standings = resources.standings(scope.pool());
    ConsultationViews.Participants participants = resources.participants(scope.pool());

    // Then
    assertThat(standings.availability()).isEqualTo(StandingsAvailabilityEnum.UNAVAILABLE);
    assertThat(standings.observedAt()).isNull();
    assertThat(standings.lastAttemptFailed()).isFalse();
    assertThat(participants.items())
        .extracting(item -> item.team().team().id())
        .containsExactly(match.awayTeamId(), match.homeTeamId());
    assertThat(participants.items()).allSatisfy(item -> assertThat(item.location()).isNull());
  }

  @Test
  @DisplayName("Preserves official order labels positions columns and special statistics")
  void preservesOfficialTable() {
    // Given
    table("PUBLISHED", true);
    UUID first = UUID.fromString("00000000-0000-4000-8000-000000002091");
    UUID second = UUID.fromString("00000000-0000-4000-8000-000000002092");
    sql.update(
        "INSERT INTO sporting_standing_column(pool_id,column_index,label) VALUES (?,0,'Ratio'),(?,1,'Pts')",
        scope.pool(),
        scope.pool());
    sql.update(
        "INSERT INTO sporting_standing_row(id,pool_id,row_index,source_name,position,team_id) VALUES (?,?,0,'Official Z',7,?),(?,?,1,'Unmatched',NULL,NULL)",
        first,
        scope.pool(),
        match.homeTeamId(),
        second,
        scope.pool());
    sql.update(
        "INSERT INTO sporting_standing_statistic(row_id,label,value) VALUES (?,'Ratio','∞'),(?,'Pts','18'),(?,'Ratio','—')",
        first,
        first,
        second);

    // When
    ConsultationViews.Standings result = resources.standings(scope.pool());

    // Then
    assertThat(result.availability()).isEqualTo(StandingsAvailabilityEnum.AVAILABLE);
    assertThat(result.columns()).containsExactly("Ratio", "Pts");
    assertThat(result.rows())
        .extracting(ConsultationViews.StandingRow::sourceName)
        .containsExactly("Official Z", "Unmatched");
    assertThat(result.rows().getFirst().position()).isEqualTo(7);
    assertThat(result.rows().getFirst().team().id()).isEqualTo(match.homeTeamId());
    assertThat(result.rows().getLast().position()).isNull();
    assertThat(result.rows().getLast().team()).isNull();
    assertThat(result.rows().getLast().statistics()).isEqualTo(Map.of("Ratio", "—"));
    assertThat(result.observedAt()).isEqualTo(OBSERVED);
  }

  @ParameterizedTest
  @CsvSource({
    "PUBLISHED,true,available",
    "NOT_PUBLISHED,true,available",
    "NOT_PUBLISHED,false,not-published"
  })
  @DisplayName("Distinguishes a genuinely empty retained table from qualified non-publication")
  void preservesEmptyPublication(String state, boolean retained, String expected) {
    // Given
    table(state, retained);

    // When
    ConsultationViews.Standings result = resources.standings(scope.pool());

    // Then
    assertThat(result.availability().getValue()).isEqualTo(expected);
    assertThat(result.rows()).isEmpty();
    assertThat(result.columns()).isEmpty();
    assertThat(result.observedAt()).isEqualTo(retained ? OBSERVED : null);
  }

  @ParameterizedTest
  @CsvSource({"true,true", "false,false"})
  @DisplayName("Only newer failed acquisition evidence changes the retained table failure flag")
  void comparesAcquisitionOrder(boolean newer, boolean expected) {
    // Given
    table("NOT_PUBLISHED", true);
    long accepted = scope.cycle().cycleOrder();
    sql.update(
        "UPDATE sporting_standings SET cycle_order=?,read_ordinal=3 WHERE pool_id=?",
        accepted,
        scope.pool());
    sql.update(
        "INSERT INTO collection_result(control_id,scope_id,stage,phase,cycle_order,read_ordinal,outcome,last_attempt_at) VALUES (?,?,'STANDINGS','ACQUISITION',?,?,'FAILED','2026-10-24T12:00:00Z')",
        SportingIngestionFixture.CONTROL,
        scope.pool(),
        accepted,
        newer ? 4 : 2);
    sql.update(
        "INSERT INTO collection_result(control_id,scope_id,stage,phase,cycle_order,read_ordinal,outcome) VALUES (?,?,'CALENDAR','ACQUISITION',?,9,'FAILED')",
        SportingIngestionFixture.CONTROL,
        scope.pool(),
        accepted);

    // When
    ConsultationViews.Standings result = resources.standings(scope.pool());

    // Then
    assertThat(result.availability()).isEqualTo(StandingsAvailabilityEnum.AVAILABLE);
    assertThat(result.observedAt()).isEqualTo(OBSERVED);
    assertThat(result.lastAttemptFailed()).isEqualTo(expected);
  }

  @Test
  @DisplayName("A failed first acquisition is unavailable and does not invent a publication")
  void reportsFailedFirstAttempt() {
    // Given
    sql.update(
        "INSERT INTO collection_result(control_id,scope_id,stage,phase,cycle_order,read_ordinal,outcome) VALUES (?,?,'STANDINGS','ACQUISITION',?,1,'FAILED')",
        SportingIngestionFixture.CONTROL,
        scope.pool(),
        scope.cycle().cycleOrder());

    // When
    ConsultationViews.Standings result = resources.standings(scope.pool());

    // Then
    assertThat(result.availability()).isEqualTo(StandingsAvailabilityEnum.UNAVAILABLE);
    assertThat(result.lastAttemptFailed()).isTrue();
    assertThat(result.observedAt()).isNull();
    assertThat(resources.participants(scope.pool()).items()).hasSize(2);
  }

  @Test
  @DisplayName(
      "Preserves every coincident participant and removes only forbidden municipality points")
  void preservesIndependentLocations() {
    // Given
    sql.update(
        "UPDATE sporting_club SET municipality='Paris', municipality_mode='SOURCE',latitude=48.85,longitude=2.35");
    ConsultationViews.Participants located = resources.participants(scope.pool());
    sql.update(
        "UPDATE sporting_club SET municipality_restricted=TRUE WHERE id=(SELECT club_id FROM sporting_team WHERE id=?)",
        match.homeTeamId());

    // When
    ConsultationViews.Participants partial = resources.participants(scope.pool());

    // Then
    assertThat(located.items())
        .allSatisfy(
            item -> {
              assertThat(item.location().latitude()).isEqualTo(48.85);
              assertThat(item.location().longitude()).isEqualTo(2.35);
            });
    assertThat(partial.items()).hasSize(2);
    assertThat(partial.items().getFirst().location()).isNotNull();
    assertThat(partial.items().getLast().location()).isNull();
  }

  @Test
  @DisplayName("A withdrawn participation loses its link only in that pool")
  void withdrawsOneParticipation() {
    // Given
    UUID other =
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
                "Other pool",
                new SportingClassification(
                    SportingIngestionFixture.DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    identities.identifyMatch(
        other,
        "OTHER",
        new TeamCandidate(null, "Zulu", "00209", "Club Z"),
        new TeamCandidate(null, "Alpha", "00210", "Club A"));
    table("PUBLISHED", true);
    sql.update(
        "INSERT INTO sporting_standing_row(id,pool_id,row_index,source_name,position,team_id) VALUES (?,?,0,'Official Z',7,?)",
        UUID.fromString("00000000-0000-4000-8000-000000002093"),
        scope.pool(),
        match.homeTeamId());
    sql.update(
        "UPDATE sporting_participation SET current=FALSE WHERE pool_id=? AND team_id=?",
        scope.pool(),
        match.homeTeamId());

    // When
    ConsultationViews.Standings standings = resources.standings(scope.pool());

    // Then
    assertThat(standings.rows().getFirst().sourceName()).isEqualTo("Official Z");
    assertThat(standings.rows().getFirst().team()).isNull();
    assertThat(resources.participants(scope.pool()).items())
        .extracting(item -> item.team().team().id())
        .containsExactly(match.awayTeamId());
    assertThat(resources.participants(other).items())
        .extracting(item -> item.team().team().id())
        .contains(match.homeTeamId());
  }

  @Test
  @DisplayName("A professional team without a club remains a participant without a point")
  void readsClublessProfessional() {
    // Given
    UUID professional =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.LNV, scope.season(), "LNV", "PRO", null, null, "PRO"),
                "PACK",
                "Professional",
                new SportingClassification(
                    SportingIngestionFixture.DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    identities.identifyMatch(
        professional,
        "PRO",
        new TeamCandidate("P1", "Pro A", null, null),
        new TeamCandidate("P2", "Pro B", null, null));

    // When
    ConsultationViews.Participants result = resources.participants(professional);

    // Then
    assertThat(result.items())
        .hasSize(2)
        .allSatisfy(
            item -> {
              assertThat(item.team().professional()).isTrue();
              assertThat(item.team().club()).isNull();
              assertThat(item.location()).isNull();
            });
  }

  @Test
  @DisplayName("Current pool restrictions refuse both independent reads")
  void refusesHiddenPool() {
    // Given
    sql.update("UPDATE sporting_pool SET catalog_eligible=FALSE WHERE id=?", scope.pool());

    // When / Then
    assertThatThrownBy(() -> resources.standings(scope.pool()))
        .isInstanceOf(SportingResourceNotFoundException.class);
    assertThatThrownBy(() -> resources.participants(scope.pool()))
        .isInstanceOf(SportingResourceNotFoundException.class);
  }

  /**
   * Seeds one accepted F02 publication, with table attribution independently retained.
   *
   * @param publication scenario's current qualified publication state
   * @param retained whether a usable table, including an empty table, has been accepted
   */
  private void table(String publication, boolean retained) {
    sql.update(
        "INSERT INTO sporting_standings(pool_id,cycle_order,read_ordinal,publication_state,observed_at,table_observed_at) VALUES (?,?,1,?,'2026-10-22T12:00:00Z',?)",
        scope.pool(),
        scope.cycle().cycleOrder(),
        publication,
        retained ? OBSERVED : null);
  }
}
