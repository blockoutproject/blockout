package com.blockout.backend.identity.subscription.infrastructure.persistence;

import com.blockout.backend.identity.subscription.application.*;
import com.blockout.backend.identity.subscription.domain.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Subscription SQL owned by identity; no query reaches into queue internals. */
public final class PostgresSubscriptions implements SubscriptionStore {
  private final JdbcTemplate sql;
  private static final String PROJECTION =
      "SELECT s.*,b.project_id,b.environment,b.customer_id FROM identity.subscription_states s JOIN identity.billing_bindings b USING(user_id) WHERE s.user_id=?";

  /**
   * Binds owner persistence to the shared transaction datasource.
   *
   * @param sql transaction-aware JDBC operations
   */
  public PostgresSubscriptions(JdbcTemplate sql) {
    this.sql = sql;
  }

  /** {@inheritDoc} */
  @Override
  public Optional<SubscriptionSnapshot> find(UUID userId) {
    return sql.query(PROJECTION, this::snapshot, userId).stream().findFirst();
  }

  /** {@inheritDoc} */
  @Override
  public SubscriptionSnapshot lock(UUID userId) {
    if (!TransactionSynchronizationManager.isActualTransactionActive())
      throw new IllegalStateException("Subscription write requires a transaction");
    sql.update(
        "INSERT INTO identity.subscription_states(user_id,requested_revision,processed_revision) VALUES (?,0,0) ON CONFLICT DO NOTHING",
        userId);
    return sql.query(PROJECTION + " FOR UPDATE OF s", this::snapshot, userId).getFirst();
  }

  /** {@inheritDoc} */
  @Override
  public void request(UUID userId, long revision, UUID jobId, Instant requestedAt) {
    sql.update(
        "UPDATE identity.subscription_states SET requested_revision=?,job_id=?,requested_at=? WHERE user_id=?",
        revision,
        jobId,
        timestamp(requestedAt),
        userId);
  }

  /** {@inheritDoc} */
  @Override
  public void verified(
      UUID userId,
      long revision,
      SubscriptionObservation.Verified observation,
      Instant now,
      Instant nextRefreshAt) {
    sql.update(
        """
        UPDATE identity.subscription_states SET positive=?,verified_at=?,access_expires_at=NULL,
        processed_revision=?,job_id=NULL,next_refresh_at=?,failure_code=NULL,failed_at=NULL WHERE user_id=?
        """,
        observation.positive(),
        timestamp(now),
        revision,
        timestamp(nextRefreshAt),
        userId);
  }

  /** {@inheritDoc} */
  @Override
  public void failed(UUID userId, SubscriptionFailure failure, Instant now) {
    sql.update(
        "UPDATE identity.subscription_states SET failure_code=?,failed_at=?,next_refresh_at=? WHERE user_id=?",
        failure.name(),
        timestamp(now),
        timestamp(now.plusSeconds(900)),
        userId);
  }

  /** {@inheritDoc} */
  @Override
  public void invalidate(UUID userId) {
    sql.update(
        "UPDATE identity.subscription_states SET positive=NULL,access_expires_at=NULL,failure_code=NULL WHERE user_id=?",
        userId);
  }

  /** {@inheritDoc} */
  @Override
  public List<UUID> due(Instant now) {
    return sql.query(
        """
        SELECT b.user_id FROM identity.billing_bindings b
        JOIN identity.users u ON u.id=b.user_id
        LEFT JOIN identity.subscription_states s USING(user_id)
        WHERE u.active AND (s.user_id IS NULL OR (s.positive=true AND s.next_refresh_at<=?))
        ORDER BY s.next_refresh_at NULLS FIRST,b.user_id LIMIT 100
        """,
        (row, index) -> row.getObject(1, UUID.class),
        timestamp(now));
  }

  /** {@inheritDoc} */
  @Override
  public List<UUID> owners(String project, String environment, Set<String> customers) {
    if (customers.isEmpty()) return List.of();
    List<Object> parameters = new ArrayList<>();
    parameters.add(project);
    parameters.add(environment);
    parameters.addAll(customers);
    return sql.query(
        "SELECT user_id FROM identity.billing_bindings WHERE project_id=? AND environment=? AND customer_id IN ("
            + String.join(",", Collections.nCopies(customers.size(), "?"))
            + ") ORDER BY user_id",
        (row, index) -> row.getObject(1, UUID.class),
        parameters.toArray());
  }

  /** {@inheritDoc} */
  @Override
  public boolean receipt(String id, String type, Instant eventAt, Instant receivedAt) {
    return sql.update(
            "INSERT INTO identity.webhook_receipts(event_id,event_type,event_at,received_at) VALUES (?,?,?,?) ON CONFLICT DO NOTHING",
            id,
            type,
            timestamp(eventAt),
            timestamp(receivedAt))
        == 1;
  }

  /**
   * Maps nullable SQL evidence once at the persistence boundary.
   *
   * @param row joined state/binding row
   * @param index JDBC row index
   * @return immutable owner projection
   * @throws SQLException if the database cannot decode the row
   */
  private SubscriptionSnapshot snapshot(ResultSet row, int index) throws SQLException {
    var failure = row.getString("failure_code");
    return new SubscriptionSnapshot(
        new BillingBinding(
            row.getObject("user_id", UUID.class),
            row.getString("project_id"),
            row.getString("environment"),
            row.getString("customer_id")),
        new SubscriptionEvidence(
            row.getObject("positive", Boolean.class),
            instant(row, "verified_at"),
            instant(row, "access_expires_at"),
            failure == null ? null : SubscriptionFailure.valueOf(failure)),
        row.getLong("requested_revision"),
        row.getLong("processed_revision"),
        row.getObject("job_id", UUID.class),
        instant(row, "requested_at"),
        instant(row, "next_refresh_at"));
  }

  /**
   * Reads a nullable timestamptz without applying a host timezone.
   *
   * @param row JDBC row
   * @param column timestamp column
   * @return stored instant or null
   * @throws SQLException if the column cannot be read
   */
  private static Instant instant(ResultSet row, String column) throws SQLException {
    var value = row.getTimestamp(column);
    return value == null ? null : value.toInstant();
  }

  /**
   * Adapts an optional instant for JDBC binding.
   *
   * @param value application instant
   * @return SQL timestamp or null
   */
  private static Timestamp timestamp(Instant value) {
    return value == null ? null : Timestamp.from(value);
  }

  /** {@inheritDoc} */
  @Override
  public void deferScan(UUID userId, Instant next) {
    sql.update(
        "UPDATE identity.subscription_states SET next_refresh_at=? WHERE user_id=?",
        timestamp(next),
        userId);
  }

  /** {@inheritDoc} */
  @Override
  public long stalePositiveCount(Instant cutoff) {
    return sql.queryForObject(
        "SELECT count(*) FROM identity.subscription_states WHERE positive=true AND verified_at<=?",
        Long.class,
        timestamp(cutoff));
  }
}
