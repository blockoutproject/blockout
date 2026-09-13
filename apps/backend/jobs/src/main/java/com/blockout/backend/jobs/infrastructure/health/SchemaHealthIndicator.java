package com.blockout.backend.jobs.infrastructure.health;

import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;

/** Refuses readiness on missing/incompatible schema without changing it. */
public final class SchemaHealthIndicator implements HealthIndicator {
  private final JdbcTemplate sql;

  /**
   * Binds the adapter to its application-owned collaborators.
   *
   * @param sql read-only access to generation and required queue columns
   */
  public SchemaHealthIndicator(JdbcTemplate sql) {
    this.sql = sql;
  }

  /** {@inheritDoc} */
  @Override
  public Health health() {
    try {
      Integer generation =
          sql.queryForObject(
              "SELECT generation FROM operations.schema_metadata WHERE id=1", Integer.class);
      sql.queryForList(
          "SELECT id,job_type,payload_version,deduplication_key,payload,state,created_at,available_at,attempts,max_attempts,lease_token,lease_expires_at,finished_at,last_error_code FROM operations.jobs LIMIT 0");
      return Integer.valueOf(4).equals(generation) ? Health.up().build() : Health.down().build();
    } catch (DataAccessException _) {
      return Health.down().build();
    }
  }
}
