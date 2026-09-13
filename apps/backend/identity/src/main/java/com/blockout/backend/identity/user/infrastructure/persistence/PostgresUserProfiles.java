package com.blockout.backend.identity.user.infrastructure.persistence;

import com.blockout.backend.identity.user.application.*;
import com.blockout.backend.identity.user.domain.ExternalIdentity;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * PostgreSQL constraints arbitrate identities and pseudonyms; all three inserts share the owner
 * transaction.
 */
public final class PostgresUserProfiles implements UserProfileStore {
  private final JdbcTemplate sql;

  public PostgresUserProfiles(JdbcTemplate sql) {
    this.sql = sql;
  }

  @Override
  public Optional<UserProfile> find(ExternalIdentity identity) {
    return sql
        .query(
            "SELECT u.* FROM identity.users u JOIN identity.external_identities e ON e.user_id=u.id WHERE e.issuer=? AND e.subject=?",
            (rs, _) -> read(rs),
            identity.issuer(),
            identity.subject())
        .stream()
        .findFirst();
  }

  @Override
  public void lockCreation(ExternalIdentity identity) {
    requireTransaction();
    // Hash collisions only serialize unrelated creations; exact SQL keys remain authoritative.
    sql.query(
        "SELECT pg_advisory_xact_lock(hashtextextended(?,0))",
        _ -> {},
        identity.issuer() + "\n" + identity.subject());
  }

  @Override
  public Optional<UserProfile> create(
      ExternalIdentity identity,
      UUID id,
      String pseudo,
      ExternalProfile attrs,
      Instant now,
      String project,
      String environment) {
    requireTransaction();
    var inserted =
        sql.query(
            "INSERT INTO identity.users(id,pseudo,pseudo_key,email,first_name,last_name,phone_number,picture_url,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,true,?,?) ON CONFLICT(pseudo_key) DO NOTHING RETURNING *",
            (rs, _) -> read(rs),
            id,
            pseudo,
            pseudo.toLowerCase(Locale.ROOT),
            attrs.email(),
            attrs.firstName(),
            attrs.lastName(),
            attrs.phoneNumber(),
            attrs.pictureUrl(),
            Timestamp.from(now),
            Timestamp.from(now));
    if (inserted.isEmpty()) return Optional.empty();
    sql.update(
        "INSERT INTO identity.external_identities(issuer,subject,user_id) VALUES (?,?,?)",
        identity.issuer(),
        identity.subject(),
        id);
    sql.update(
        "INSERT INTO identity.billing_bindings(user_id,project_id,environment,customer_id,created_at) VALUES (?,?,?,?,?)",
        id,
        project,
        environment,
        identity.subject(),
        Timestamp.from(now));
    return Optional.of(inserted.getFirst());
  }

  private UserProfile read(ResultSet rs) throws SQLException {
    return new UserProfile(
        rs.getObject("id", UUID.class),
        rs.getString("pseudo"),
        rs.getString("email"),
        rs.getString("first_name"),
        rs.getString("last_name"),
        rs.getString("phone_number"),
        rs.getString("picture_url"),
        rs.getBoolean("active"),
        rs.getTimestamp("created_at").toInstant(),
        rs.getTimestamp("updated_at").toInstant());
  }

  private void requireTransaction() {
    if (!TransactionSynchronizationManager.isActualTransactionActive()
        || !TransactionSynchronizationManager.hasResource(sql.getDataSource()))
      throw new IllegalStateException("Profile creation requires an owner transaction");
  }
}
