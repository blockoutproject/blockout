package com.blockout.backend.identity.infrastructure.health;

import org.springframework.boot.health.contributor.*;
import org.springframework.jdbc.core.JdbcTemplate;

/** Checks every profile/binding column without mutating data or contacting identity providers. */
public final class IdentitySchemaHealthIndicator implements HealthIndicator {
  private final JdbcTemplate sql;

  public IdentitySchemaHealthIndicator(JdbcTemplate sql) {
    this.sql = sql;
  }

  @Override
  public Health health() {
    try {
      sql.queryForList(
          "SELECT id,pseudo,pseudo_key,email,first_name,last_name,phone_number,picture_url,active,created_at,updated_at FROM identity.users LIMIT 0");
      sql.queryForList("SELECT issuer,subject,user_id FROM identity.external_identities LIMIT 0");
      sql.queryForList(
          "SELECT user_id,project_id,environment,customer_id,created_at FROM identity.billing_bindings LIMIT 0");
      return Health.up().build();
    } catch (RuntimeException failure) {
      return Health.down().build();
    }
  }
}
