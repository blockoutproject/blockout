package com.blockout.backend.identity.infrastructure.health;

import org.springframework.boot.health.contributor.*;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;

/** Checks every profile/binding column without mutating data or contacting identity providers. */
public final class IdentitySchemaHealthIndicator implements HealthIndicator {
  private final JdbcTemplate sql;

  /**
   * Binds readiness to required identity tables and columns.
   *
   * @param sql read-only schema access
   */
  public IdentitySchemaHealthIndicator(JdbcTemplate sql) {
    this.sql = sql;
  }

  /** {@inheritDoc} */
  @Override
  public Health health() {
    try {
      sql.queryForList(
          "SELECT id,pseudo,pseudo_key,email,first_name,last_name,phone_number,picture_url,active,created_at,updated_at FROM identity.users LIMIT 0");
      sql.queryForList("SELECT issuer,subject,user_id FROM identity.external_identities LIMIT 0");
      sql.queryForList(
          "SELECT user_id,project_id,environment,customer_id,created_at FROM identity.billing_bindings LIMIT 0");
      sql.queryForList(
          "SELECT user_id,positive,verified_at,access_expires_at,requested_revision,processed_revision,job_id,requested_at,next_refresh_at,failure_code,failed_at FROM identity.subscription_states LIMIT 0");
      sql.queryForList(
          "SELECT event_id,event_type,event_at,received_at FROM identity.webhook_receipts LIMIT 0");
      sql.queryForList("SELECT user_id,role FROM identity.user_roles LIMIT 0");
      return Health.up().build();
    } catch (DataAccessException _) {
      return Health.down().build();
    }
  }
}
