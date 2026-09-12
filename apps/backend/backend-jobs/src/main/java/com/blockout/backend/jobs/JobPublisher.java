package com.blockout.backend.jobs;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Publishes bounded work inside the transaction which owns its durable cause. */
public final class JobPublisher {
  private final JdbcTemplate sql;
  private final JsonMapper json;

  public JobPublisher(JdbcTemplate sql, JsonMapper json) {
    this.sql = sql;
    this.json = json;
  }

  public UUID publish(String type, int version, String key, Object payload) {
    if (!TransactionSynchronizationManager.isActualTransactionActive()
        || !TransactionSynchronizationManager.hasResource(sql.getDataSource()))
      throw new IllegalStateException("An owner transaction is required");
    if (type == null
        || !type.matches("[a-z][a-z0-9.-]{0,99}")
        || version < 1
        || key == null
        || key.isBlank()
        || key.length() > 200) throw new IllegalArgumentException("Invalid job identity");
    String body = json.writeValueAsString(canonical(json.valueToTree(payload)));
    if (body.getBytes(StandardCharsets.UTF_8).length > 65536)
      throw new IllegalArgumentException("Job payload exceeds 64 KiB");
    String hash = hash(version + ":" + body);
    UUID id = UUID.randomUUID();
    sql.update(
        """
   INSERT INTO operations.jobs(id,job_type,payload_version,deduplication_key,payload_hash,payload,state,created_at,available_at,attempts,max_attempts)
   VALUES (?,?,?,?,?,?::jsonb,'pending',clock_timestamp(),clock_timestamp(),0,5)
   ON CONFLICT (job_type,deduplication_key) DO NOTHING
   """,
        id,
        type,
        version,
        key,
        hash,
        body);
    return sql.queryForObject(
        "SELECT id,payload_hash FROM operations.jobs WHERE job_type=? AND deduplication_key=?",
        (rs, n) -> {
          if (!hash.equals(rs.getString("payload_hash"))) throw new JobConflictException();
          return rs.getObject("id", UUID.class);
        },
        type,
        key);
  }

  private Object canonical(JsonNode node) {
    if (node.isObject()) {
      Map<String, Object> sorted = new TreeMap<>();
      node.properties().forEach(e -> sorted.put(e.getKey(), canonical(e.getValue())));
      return sorted;
    }
    if (node.isArray()) {
      List<Object> values = new ArrayList<>();
      node.forEach(v -> values.add(canonical(v)));
      return values;
    }
    if (node.isNumber()) return new BigDecimal(node.asText()).stripTrailingZeros();
    if (node.isBoolean()) return node.asBoolean();
    if (node.isNull()) return null;
    return node.asText();
  }

  private String hash(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 unavailable", e);
    }
  }
}
