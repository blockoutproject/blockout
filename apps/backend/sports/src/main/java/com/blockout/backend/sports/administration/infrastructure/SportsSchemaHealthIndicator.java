package com.blockout.backend.sports.administration.infrastructure;

import org.springframework.boot.health.contributor.*;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;

/** Refuses sports administration readiness when its required schema is absent or incompatible. */
public final class SportsSchemaHealthIndicator implements HealthIndicator {
  private final JdbcTemplate sql;

  /**
   * Binds schema readiness to the application datasource.
   *
   * @param sql read-only access to the runtime sports schema
   */
  public SportsSchemaHealthIndicator(JdbcTemplate sql) {
    this.sql = sql;
  }

  /** {@inheritDoc} */
  @Override
  public Health health() {
    try {
      sql.queryForList(
          "SELECT id,enabled,season,updated_by,updated_at FROM sports.ffvb_configuration LIMIT 0");
      sql.queryForList("SELECT code FROM sports.ffvb_sources LIMIT 0");
      sql.queryForList("SELECT id,name,active,updated_by,updated_at FROM sports.divisions LIMIT 0");
      sql.queryForList(
          "SELECT id,organizer,label,division_id,format,gender,updated_by,updated_at FROM sports.ffvb_mappings LIMIT 0");
      sql.queryForList("SELECT id,ffvb_code,name FROM sports.clubs LIMIT 0");
      sql.queryForList(
          "SELECT id,club_id,season,division_id,format,gender,canonical_name,display_name FROM sports.teams LIMIT 0");
      sql.queryForList(
          "SELECT id,provider,organizer,season,code,name,active FROM sports.pools LIMIT 0");
      sql.queryForList("SELECT pool_id,team_id,active FROM sports.team_pool_memberships LIMIT 0");
      return Health.up().build();
    } catch (DataAccessException _) {
      return Health.down().build();
    }
  }
}
