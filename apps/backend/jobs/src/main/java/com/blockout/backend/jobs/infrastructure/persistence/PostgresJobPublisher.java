package com.blockout.backend.jobs.infrastructure.persistence;

import com.blockout.backend.jobs.application.JobPublisher;
import com.blockout.backend.jobs.application.PublicationResult;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.json.JsonMapper;

/** Publishes bounded work inside the transaction which owns its durable cause. */
public final class PostgresJobPublisher implements JobPublisher {
  private final JdbcTemplate sql;
  private final JsonMapper json;

  /**
   * Binds the adapter to its application-owned collaborators.
   *
   * @param sql datasource shared with owner transactions
   * @param json serializer for bounded publication payloads
   */
  public PostgresJobPublisher(JdbcTemplate sql, JsonMapper json) {
    this.sql = sql;
    this.json = json;
  }

  /** {@inheritDoc} */
  @Override
  public PublicationResult publish(String type, int version, String key, Object payload) {
    if (!TransactionSynchronizationManager.isActualTransactionActive()
        || !TransactionSynchronizationManager.hasResource(sql.getDataSource()))
      throw new IllegalStateException("An owner transaction is required");
    if (type == null
        || !type.matches("[a-z][a-z0-9.-]{0,99}")
        || version < 1
        || key == null
        || key.isBlank()
        || key.length() > 200) return new PublicationResult.Rejected("INVALID_IDENTITY");
    String body = json.writeValueAsString(payload);
    if (body.getBytes(StandardCharsets.UTF_8).length > 65536)
      return new PublicationResult.Rejected("PAYLOAD_TOO_LARGE");
    UUID id = UUID.randomUUID();
    sql.update(
        """
        INSERT INTO operations.jobs (
          id,job_type,payload_version,deduplication_key,payload,
          state,created_at,available_at,attempts,max_attempts
        ) VALUES (?,?,?,?,?::jsonb,'pending',clock_timestamp(),clock_timestamp(),0,5)
        ON CONFLICT (job_type,deduplication_key) DO NOTHING
        """,
        id,
        type,
        version,
        key,
        body);
    return sql.queryForObject(
        "SELECT id, payload_version=? AND payload=?::jsonb AS identical FROM operations.jobs WHERE job_type=? AND deduplication_key=?",
        (rs, _) -> {
          if (!rs.getBoolean("identical")) return new PublicationResult.Conflict();
          return new PublicationResult.Accepted(rs.getObject("id", UUID.class));
        },
        version,
        body,
        type,
        key);
  }
}
