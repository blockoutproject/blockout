package com.blockout.outbox;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

final class JdbcOutboxStore implements OutboxStore {

    private final JdbcTemplate jdbc;

    JdbcOutboxStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void insert(OutboxEvent event, String v1Json, String v2Json) {
        jdbc.update("""
                insert into event_outbox (
                    event_id, event_type, schema_version, producer, ordering_key, aggregate_version,
                    correlation_id, occurred_at, exchange_name, v1_routing_key, v1_payload, v1_payload_type,
                    v2_enabled, v2_routing_key, v2_payload, next_attempt_at, created_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, cast(? as jsonb), ?, ?, ?, cast(? as jsonb), ?, ?)
                """,
                event.metadata().eventId(), event.eventType(), event.schemaVersion(), event.producer(),
                event.orderingKey(), event.aggregateVersion(), event.metadata().correlationId(),
                Timestamp.from(event.metadata().occurredAt().toInstant()), event.exchange(), event.v1RoutingKey(),
                v1Json, event.v1Payload().getClass().getName(), event.v2Enabled(), event.v2RoutingKey(), v2Json,
                Timestamp.from(event.metadata().occurredAt().toInstant()),
                Timestamp.from(event.metadata().occurredAt().toInstant()));
    }

    @Override
    public List<OutboxRow> claimReady(Instant now, int batchSize) {
        return jdbc.query("""
                select event_id, event_type, schema_version, producer, ordering_key, aggregate_version,
                       correlation_id, occurred_at, exchange_name, v1_routing_key, v1_payload::text,
                       v1_payload_type, v1_published_at, v2_enabled, v2_routing_key, v2_payload::text,
                       v2_published_at, attempt_count
                  from event_outbox
                 where completed_at is null and next_attempt_at <= ?
                 order by occurred_at, event_id
                 limit ?
                   for update skip locked
                """, this::row, Timestamp.from(now), batchSize);
    }

    @Override
    public void markV1Published(UUID eventId, Instant publishedAt) {
        Timestamp timestamp = Timestamp.from(publishedAt);
        jdbc.update("""
                update event_outbox
                   set v1_published_at = ?, last_error = null,
                       completed_at = case when not v2_enabled or v2_published_at is not null then ? else completed_at end
                 where event_id = ? and v1_published_at is null
                """, timestamp, timestamp, eventId);
    }

    @Override
    public void markV2Published(UUID eventId, Instant publishedAt) {
        Timestamp timestamp = Timestamp.from(publishedAt);
        jdbc.update("""
                update event_outbox
                   set v2_published_at = ?, last_error = null,
                       completed_at = case when v1_published_at is not null then ? else completed_at end
                 where event_id = ? and v2_enabled and v2_published_at is null
                """, timestamp, timestamp, eventId);
    }

    @Override
    public void markFailure(UUID eventId, int attemptCount, Instant nextAttemptAt, String error) {
        jdbc.update("""
                update event_outbox
                   set attempt_count = ?, next_attempt_at = ?, last_error = ?
                 where event_id = ?
                """, attemptCount, Timestamp.from(nextAttemptAt), error, eventId);
    }

    @Override
    public long countPending() {
        Long count = jdbc.queryForObject("select count(*) from event_outbox where completed_at is null", Long.class);
        return count == null ? 0 : count;
    }

    @Override
    public int deleteCompletedBefore(Instant cutoff) {
        return jdbc.update("delete from event_outbox where completed_at < ?", Timestamp.from(cutoff));
    }

    private OutboxRow row(ResultSet rs, int rowNumber) throws SQLException {
        return new OutboxRow(
                rs.getObject("event_id", UUID.class),
                rs.getString("event_type"),
                rs.getString("schema_version"),
                rs.getString("producer"),
                rs.getString("ordering_key"),
                rs.getObject("aggregate_version", Long.class),
                rs.getString("correlation_id"),
                rs.getTimestamp("occurred_at").toInstant(),
                rs.getString("exchange_name"),
                rs.getString("v1_routing_key"),
                rs.getString("v1_payload"),
                rs.getString("v1_payload_type"),
                instant(rs, "v1_published_at"),
                rs.getBoolean("v2_enabled"),
                rs.getString("v2_routing_key"),
                rs.getString("v2_payload"),
                instant(rs, "v2_published_at"),
                rs.getInt("attempt_count"));
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }
}
