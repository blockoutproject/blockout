package com.blockout.backend.notifications.testsupport;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Stateless synthetic sporting/owner data for each inbox suite's own migrated PostgreSQL. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class InboxDatabaseFixture {
  public static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000001");
  public static final UUID OTHER = UUID.fromString("00000000-0000-4000-8000-000000000002");
  public static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000010");
  public static final UUID DIVISION = UUID.fromString("00000000-0000-4000-8000-000000000011");
  public static final UUID PACK = UUID.fromString("00000000-0000-4000-8000-000000000012");
  public static final UUID POOL = UUID.fromString("00000000-0000-4000-8000-000000000013");
  public static final UUID HOME = UUID.fromString("00000000-0000-4000-8000-000000000014");
  public static final UUID AWAY = UUID.fromString("00000000-0000-4000-8000-000000000015");
  public static final Instant NOW = Instant.parse("2026-10-25T12:00:00.123456Z");

  /**
   * Recreates synthetic owner and sporting scope only in the calling suite's database.
   *
   * @param database concrete suite-owned disposable container
   * @param sql application-role connection to that same container
   * @throws Exception on isolated fixture failure
   */
  public static void reset(PostgreSQLContainer database, JdbcTemplate sql) throws Exception {
    try (Connection connection =
            DriverManager.getConnection(
                database.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement fixture = connection.createStatement()) {
      fixture.execute("TRUNCATE sporting_season, sporting_division, account CASCADE");
    }
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email) VALUES (?, 'https://identity.example.invalid/', 'one', 'first', 'one@example.invalid'), (?, 'https://identity.example.invalid/', 'two', 'second', 'two@example.invalid')",
        ACCOUNT,
        OTHER);
    sql.update(
        "INSERT INTO sporting_season(id,start_year,label) VALUES (?,2026,'2026/2027')", SEASON);
    sql.update(
        "INSERT INTO sporting_division(id,name,active,color) VALUES (?,'Synthetic',TRUE,'#112233')",
        DIVISION);
    sql.update(
        "INSERT INTO sporting_pack(id,season_id,provider,organizer_reference,reference) VALUES (?,?,'LNV','synthetic','pack')",
        PACK,
        SEASON);
    sql.update(
        "INSERT INTO sporting_pool(id,season_id,pack_id,provider,organizer_reference,competition_reference,reference,source_name,division_id,format,gender) VALUES (?,?,?,'LNV','synthetic','competition','pool','Pool',?,'_6X6','MIXED')",
        POOL,
        SEASON,
        PACK,
        DIVISION);
    for (UUID team : java.util.List.of(HOME, AWAY)) {
      sql.update(
          "INSERT INTO sporting_team(id,season_id,provider,organizer_reference,competition_reference,native_reference,source_name,comparison_name,division_id,format,gender) VALUES (?,?,'LNV','synthetic','competition',?,'Team',?,?,'_6X6','MIXED')",
          team,
          SEASON,
          team.toString(),
          team.toString(),
          DIVISION);
      sql.update(
          "INSERT INTO sporting_participation(id,pool_id,team_id,current) VALUES (?,?,?,TRUE)",
          UUID.fromString(
              team.equals(HOME)
                  ? "00000000-0000-4000-8000-000000000024"
                  : "00000000-0000-4000-8000-000000000025"),
          POOL,
          team);
    }
  }

  /**
   * Creates a synthetic retained allocation with explicit scenario ownership and age.
   *
   * @param sql application-role connection
   * @param number stable fixture identity
   * @param owner original account
   * @param created original instant
   * @return personal UUID, also used as the match UUID
   */
  public static UUID entry(JdbcTemplate sql, int number, UUID owner, Instant created) {
    UUID id = UUID.fromString("10000000-0000-4000-8000-" + String.format("%012d", number));
    sql.update(
        "INSERT INTO sporting_match(id,pool_id,reference,home_team_id,away_team_id,local_date,result_state,home_sets,away_sets,schedule_observed_at,result_observed_at) VALUES (?,?,?,?,?,'2026-10-24','FINAL',3,1,?,?)",
        id,
        POOL,
        id.toString(),
        HOME,
        AWAY,
        Timestamp.from(created),
        Timestamp.from(created));
    sql.update(
        "INSERT INTO notification(id,account_id,match_id,family,variant,created_at,is_read) VALUES (?,?,?,'ENRICHED_RESULT','FIRST',?,FALSE)",
        id,
        owner,
        id,
        Timestamp.from(created));
    return id;
  }
}
