package com.blockout.backend.sports.administration.infrastructure;

import static org.assertj.core.api.Assertions.*;

import com.blockout.backend.sports.administration.application.*;
import com.blockout.backend.sports.reference.domain.TeamName;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.*;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Real baseline, transaction and privilege evidence for the FFVB reference owner. */
@Testcontainers
class ReferenceIntegrationTest {
  @Container static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:17-alpine");
  @AutoClose static final ClassLoaderResourceAccessor RESOURCES = new ClassLoaderResourceAccessor();
  static JdbcTemplate owner;
  static JdbcTemplate api;
  static TransactionTemplate tx;
  static FfvbAdministration admin;
  static final UUID ACTOR = UUID.randomUUID();

  @BeforeAll
  static void setup() throws Exception {
    DriverManagerDataSource ds =
        new DriverManagerDataSource(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword());
    owner = new JdbcTemplate(ds);
    owner.execute(
        "CREATE SCHEMA operations; CREATE SCHEMA identity; CREATE SCHEMA sports; CREATE ROLE blockout_api LOGIN PASSWORD 'test'; CREATE ROLE blockout_worker LOGIN PASSWORD 'test'; GRANT USAGE ON SCHEMA operations,identity,sports TO blockout_api,blockout_worker");
    try (Connection connection = ds.getConnection();
        JdbcConnection jdbc = new JdbcConnection(connection);
        Liquibase lb = new Liquibase("db/changelog/db.changelog-master.xml", RESOURCES, jdbc)) {
      lb.update("");
    }
    DriverManagerDataSource apiDs =
        new DriverManagerDataSource(DB.getJdbcUrl(), "blockout_api", "test");
    api = new JdbcTemplate(apiDs);
    tx = new TransactionTemplate(new JdbcTransactionManager(apiDs));
    admin =
        new FfvbAdministration(
            new PostgresFfvbAdministration(api),
            Clock.fixed(Instant.parse("2026-09-13T12:00:00Z"), ZoneOffset.UTC));
    owner.update(
        "INSERT INTO identity.users(id,pseudo,pseudo_key,active,created_at,updated_at) VALUES (?,'admin','admin',true,now(),now())",
        ACTOR);
  }

  @BeforeEach
  void clear() {
    owner.execute(
        "TRUNCATE sports.clubs,sports.divisions,sports.pools,sports.ffvb_sources CASCADE");
    owner.update(
        "UPDATE sports.ffvb_configuration SET enabled=false,season=null,updated_by=null,updated_at=null");
  }

  @Test
  void preservesExactClubCodesAndUnknownNames() {
    owner.update("INSERT INTO sports.clubs(id,ffvb_code) VALUES (?,?)", UUID.randomUUID(), "00123");
    owner.update("INSERT INTO sports.clubs(id,ffvb_code) VALUES (?,?)", UUID.randomUUID(), "123");
    assertThat(
            api.queryForList("SELECT ffvb_code FROM sports.clubs ORDER BY ffvb_code", String.class))
        .containsExactly("00123", "123");
    assertThat(
            api.queryForObject(
                "SELECT name FROM sports.clubs WHERE ffvb_code='00123'", String.class))
        .isNull();
  }

  @Test
  void contextualTeamKeysKeepSeparateSeasonsAndNewNames() {
    UUID club = UUID.randomUUID();
    UUID division = UUID.randomUUID();
    UUID team = UUID.randomUUID();
    owner.update("INSERT INTO sports.clubs(id,ffvb_code) VALUES (?,'001')", club);
    owner.update(
        "INSERT INTO sports.divisions(id,name,active) VALUES (?,'Regional',true)", division);
    insertTeam(team, club, division, "2026/2027", "Original");
    assertThatThrownBy(
            () -> insertTeam(UUID.randomUUID(), club, division, "2026/2027", " Original "))
        .isInstanceOf(DataAccessException.class);
    insertTeam(UUID.randomUUID(), club, division, "2025/2026", "Original");
    insertTeam(UUID.randomUUID(), club, division, "2026/2027", "New name");
    owner.update("UPDATE sports.teams SET display_name='New display' WHERE id=?", team);
    assertThat(api.queryForObject("SELECT count(*) FROM sports.teams", Integer.class)).isEqualTo(3);
    assertThat(
            api.queryForObject(
                "SELECT canonical_name FROM sports.teams WHERE id=?", String.class, team))
        .isEqualTo("original");
  }

  @Test
  void retiringOneMembershipPreservesOtherPoolsAndReferences() {
    UUID club = UUID.randomUUID();
    UUID division = UUID.randomUUID();
    UUID team = UUID.randomUUID();
    UUID first = UUID.randomUUID();
    UUID second = UUID.randomUUID();
    owner.update("INSERT INTO sports.clubs(id,ffvb_code) VALUES (?,'001')", club);
    owner.update(
        "INSERT INTO sports.divisions(id,name,active) VALUES (?,'Regional',true)", division);
    insertTeam(team, club, division, "2026/2027", "Original");
    for (UUID pool : List.of(first, second)) {
      owner.update(
          "INSERT INTO sports.pools(id,provider,organizer,season,code,name,active) VALUES (?,'FFVB','LIAQ','2026/2027',?,'Pool',true)",
          pool,
          pool.toString());
      owner.update(
          "INSERT INTO sports.team_pool_memberships(pool_id,team_id,active) VALUES (?,?,true)",
          pool,
          team);
    }
    owner.update("UPDATE sports.team_pool_memberships SET active=false WHERE pool_id=?", first);
    assertThat(
            api.queryForObject(
                "SELECT count(*) FROM sports.team_pool_memberships WHERE team_id=? AND active",
                Integer.class,
                team))
        .isOne();
    assertThatThrownBy(() -> owner.update("DELETE FROM sports.teams WHERE id=?", team))
        .isInstanceOf(DataAccessException.class);
  }

  @Test
  void concurrentConfigurationReplacementNeverMixesSourceSets() throws Exception {
    FfvbConfigurationCommand first =
        new FfvbConfigurationCommand(true, "2026/2027", List.of("ABCCS", "LIAQ"));
    FfvbConfigurationCommand second =
        new FfvbConfigurationCommand(false, "2025/2026", List.of("PTRA01"));
    try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
      List<Future<ReferenceResult<FfvbConfigurationView>>> results =
          executor.invokeAll(
              List.of(
                  () -> tx.execute(_ -> admin.configure(first, ACTOR)),
                  () -> tx.execute(_ -> admin.configure(second, ACTOR))));
      for (Future<ReferenceResult<FfvbConfigurationView>> result : results)
        assertThat(result.get().outcome()).isEqualTo(ReferenceChange.APPLIED);
    }
    FfvbConfigurationView result = admin.configuration();
    assertThat(result.sources()).isEqualTo(result.enabled() ? first.sources() : second.sources());
  }

  @Test
  void failedTransactionRestoresConfigurationAndSources() {
    assertThatThrownBy(
            () ->
                tx.execute(
                    _ -> {
                      admin.configure(
                          new FfvbConfigurationCommand(true, "2026/2027", List.of("ABCCS")), ACTOR);
                      throw new IllegalStateException("controlled rollback");
                    }))
        .isInstanceOf(IllegalStateException.class);
    assertThat(admin.configuration().enabled()).isFalse();
    assertThat(admin.configuration().sources()).isEmpty();
  }

  @Test
  void applicationCredentialsCannotGrantRolesOrAlterSchema() {
    for (String role : List.of("blockout_api", "blockout_worker")) {
      JdbcTemplate runtime =
          new JdbcTemplate(new DriverManagerDataSource(DB.getJdbcUrl(), role, "test"));
      assertThatThrownBy(
              () ->
                  runtime.update(
                      "INSERT INTO identity.user_roles(user_id,role) VALUES (?,'ADMIN')", ACTOR))
          .isInstanceOf(DataAccessException.class);
      assertThatThrownBy(() -> runtime.execute("CREATE TABLE sports.forbidden(id int)"))
          .isInstanceOf(DataAccessException.class);
      assertThat(runtime.queryForObject("SELECT count(*) FROM sports.divisions", Integer.class))
          .isZero();
    }
  }

  @Test
  void listsDivisionsWithDeterministicBoundedContinuation() {
    for (String name : List.of("C", "A", "B"))
      tx.execute(_ -> admin.createDivision(new DivisionCommand(name, true), ACTOR));
    SportsSlice<DivisionView> first = admin.divisions(0, 2);
    SportsSlice<DivisionView> second = admin.divisions(1, 2);
    assertThat(first.items()).extracting(DivisionView::name).containsExactly("A", "B");
    assertThat(first.hasNext()).isTrue();
    assertThat(second.items()).extracting(DivisionView::name).containsExactly("C");
    assertThat(second.hasNext()).isFalse();
  }

  @Test
  void concurrentDivisionNamesProduceOneExpectedConflict() throws Exception {
    try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
      List<Future<ReferenceResult<DivisionView>>> results =
          executor.invokeAll(
              List.of(
                  () ->
                      tx.execute(
                          _ -> admin.createDivision(new DivisionCommand("Same", true), ACTOR)),
                  () ->
                      tx.execute(
                          _ -> admin.createDivision(new DivisionCommand("Same", true), ACTOR))));
      List<ReferenceChange> outcomes =
          List.of(results.get(0).get().outcome(), results.get(1).get().outcome());
      assertThat(outcomes)
          .containsExactlyInAnyOrder(ReferenceChange.APPLIED, ReferenceChange.CONFLICT);
      assertThat(admin.divisions(0, 100).items()).hasSize(1);
    }
  }

  @Test
  void missingSportsSchemaPreventsReadiness() {
    SportsSchemaHealthIndicator health = new SportsSchemaHealthIndicator(api);
    assertThat(health.health().getStatus())
        .isEqualTo(org.springframework.boot.health.contributor.Status.UP);
    owner.execute("ALTER TABLE sports.ffvb_sources RENAME TO missing_sources");
    try {
      assertThat(health.health().getStatus())
          .isEqualTo(org.springframework.boot.health.contributor.Status.DOWN);
    } finally {
      owner.execute("ALTER TABLE sports.missing_sources RENAME TO ffvb_sources");
    }
  }

  /** Inserts an already canonical alias name, exercising the authoritative PostgreSQL key. */
  private void insertTeam(UUID id, UUID club, UUID division, String season, String name) {
    owner.update(
        "INSERT INTO sports.teams(id,club_id,season,division_id,format,gender,canonical_name,display_name) VALUES (?,?,?,?,'SIX','F',?,?)",
        id,
        club,
        season,
        division,
        TeamName.normalize(name),
        name);
  }
}
