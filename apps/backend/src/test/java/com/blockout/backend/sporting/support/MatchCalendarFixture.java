package com.blockout.backend.sporting.support;

import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Synthetic calendar facts on real F02 identities in the caller's disposable database. */
@RequiredArgsConstructor
public class MatchCalendarFixture {
  private final PostgreSQLContainer database;
  private final JdbcTemplate sql;
  private final ChangeCollectionSeasons seasons;
  private final SportingIdentityFixture identities;
  private final AdmitCollectionCycle cycles;
  private final RegisterCollectorRuntime runtimes;

  /**
   * Explicitly resets this suite's migrated database and admits a real collection scope.
   *
   * @return synthetic season, pool and cycle
   * @throws Exception when fixture reset fails
   */
  public SportingIngestionFixture.Scope reset() throws Exception {
    SportingIngestionFixture.reset(database);
    sql.update("DELETE FROM collection_control");
    return SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes);
  }

  /**
   * Establishes one encounter with explicit precision and independent observation time.
   *
   * @param pool real contextual pool
   * @param reference distinct synthetic native reference
   * @param date sporting date, or null for a hidden dateless encounter
   * @param instant accepted reliable start, or null for date-only precision
   * @return exact established identities
   */
  public MatchView match(UUID pool, String reference, LocalDate date, Instant instant) {
    MatchView match =
        identities.identifyMatch(
            pool,
            reference,
            new TeamCandidate(null, "Home", "00214", "Synthetic club"),
            new TeamCandidate(null, "Away", "00215", "Other club"));
    sql.update(
        "UPDATE sporting_match SET local_date=?, reliable_start=?, schedule_observed_at='2026-09-01T12:00:00Z' WHERE id=?",
        date,
        instant == null ? null : java.sql.Timestamp.from(instant),
        match.id());
    return match;
  }
}
