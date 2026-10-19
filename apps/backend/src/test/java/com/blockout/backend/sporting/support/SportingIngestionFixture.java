package com.blockout.backend.sporting.support;

import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.collection.application.service.CollectorRuntimeService;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.service.SeasonService;
import com.blockout.backend.sporting.application.service.SportingIdentityService;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Shared synthetic admitted source; reset and admission are explicit database setup operations. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SportingIngestionFixture {
  public static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000160");
  public static final UUID SOURCE = UUID.fromString("00000000-0000-4000-8000-000000000161");
  public static final UUID DIVISION = UUID.fromString("00000000-0000-4000-8000-000000000162");

  /**
   * Deletes only this suite's disposable migrated database data.
   *
   * @param database suite-owned PostgreSQL container
   * @throws Exception when fixture cleanup fails
   */
  public static void reset(PostgreSQLContainer database) throws Exception {
    try (Connection connection =
            DriverManager.getConnection(
                database.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement fixture = connection.createStatement()) {
      fixture.execute(
          "TRUNCATE sporting_season, sporting_division, sporting_club, collection_source_binding, sporting_catalog CASCADE");
    }
  }

  /**
   * Creates known sporting/source settings and admits one real F01 cycle.
   *
   * @param sql fixture database access
   * @param seasons real season owner
   * @param identities real sporting identity owner
   * @param cycles real cycle admission owner
   * @param runtimes real incarnation owner
   * @return exact admitted synthetic scope
   */
  public static Scope admit(
      JdbcTemplate sql,
      SeasonService seasons,
      SportingIdentityService identities,
      CollectionCycleService cycles,
      CollectorRuntimeService runtimes) {
    UUID season = seasons.getOrCreate(2026).id();
    sql.update("UPDATE sporting_season SET collection_state='ACTIVE' WHERE id=?", season);
    sql.update(
        "INSERT INTO sporting_division(id,name,active,color) VALUES (?,'Synthetic',TRUE,'#112233')",
        DIVISION);
    UUID pool =
        identities
            .establishPool(
                new PoolKey(
                    CollectionProviderEnum.FFVB, season, "SYNTHETIC", "COMP", null, null, "POOL"),
                "PACK",
                "Synthetic pool",
                new SportingClassification(DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    sql.update(
        "UPDATE sporting_pool SET calendar_url='https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php', standings_url='https://www.ffvbbeach.org/ffvbapp/resu/standings', setting_division_id=?, setting_format='_6X6', setting_gender='MALE' WHERE id=?",
        DIVISION,
        pool);
    sql.update(
        "INSERT INTO collection_source_binding(id,season_id,provider,organizer_reference,accepted_url,validation_state,locked,launched) VALUES (?,?,'FFVB','SYNTHETIC','https://www.ffvbbeach.org/ffvbapp/resu/', 'QUALIFIED',FALSE,TRUE)",
        SOURCE,
        season);
    sql.update(
        "INSERT INTO collection_control(id,season_id,family,enabled) VALUES (?,?,'FFVB',TRUE)",
        CONTROL,
        season);
    UUID startup = UUID.randomUUID();
    runtimes.register(runtimes.current().revision(), startup);
    CollectionState.Cycle cycle =
        cycles
            .admit(
                new CollectionState.StartCycle(UUID.randomUUID(), startup, CONTROL, null, 0, null))
            .cycle();
    return new Scope(season, pool, cycle);
  }

  /** Known identities from an actual admitted cycle. */
  public record Scope(UUID season, UUID pool, CollectionState.Cycle cycle) {}

  /**
   * Supplies identity and optional schedule while leaving other fact groups omitted.
   *
   * @param reference native encounter identity
   * @param home scenario-defining participant label
   * @param date proposed date; null represents omission
   * @return immutable candidate with exact club references
   */
  public static CalendarObservation.Match candidate(String reference, String home, LocalDate date) {
    MatchObservation.Facts facts =
        new MatchObservation.Facts(
            date == null ? JsonNullable.undefined() : JsonNullable.of(date),
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
            JsonNullable.undefined());
    return new CalendarObservation.Match(
        reference,
        new TeamCandidate(null, home, "000160", null),
        new TeamCandidate(null, "Away", "000161", null),
        facts,
        null);
  }
}
