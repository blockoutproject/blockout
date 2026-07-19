package com.blockout.pools.pool.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.DriverManager;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

class PoolFlywayMigrationTest {

    @Test
    void migrationAddsRevisionAndAllowsCanonicalOnlyOutboxRows() throws Exception {
        String url = "jdbc:h2:mem:mrg442;MODE=PostgreSQL;DB_CLOSE_DELAY=-1";
        try (var connection = DriverManager.getConnection(url, "sa", "");
                var statement = connection.createStatement()) {
            statement.executeUpdate("CREATE TABLE pools (id BIGINT PRIMARY KEY)");
            statement.executeUpdate("""
                    CREATE TABLE event_outbox (
                        event_id UUID PRIMARY KEY,
                        event_type VARCHAR(64) NOT NULL,
                        schema_version VARCHAR(32) NOT NULL,
                        producer VARCHAR(80) NOT NULL,
                        ordering_key VARCHAR(255) NOT NULL,
                        aggregate_version BIGINT,
                        occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        exchange_name VARCHAR(255) NOT NULL,
                        v1_routing_key VARCHAR(255) NOT NULL,
                        v1_payload JSON NOT NULL,
                        v1_payload_type VARCHAR(512) NOT NULL,
                        v2_enabled BOOLEAN NOT NULL,
                        v2_routing_key VARCHAR(255),
                        v2_payload JSON,
                        CONSTRAINT ck_event_outbox_v2_pair CHECK (
                            (v2_enabled AND v2_routing_key IS NOT NULL AND v2_payload IS NOT NULL)
                            OR (NOT v2_enabled AND v2_routing_key IS NULL AND v2_payload IS NULL)
                        )
                    )
                    """);
        }
        Flyway.configure()
                .dataSource(url, "sa", "")
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion("5")
                .load()
                .migrate();

        try (var connection = DriverManager.getConnection(url, "sa", "");
                var statement = connection.createStatement()) {
            statement.executeUpdate("INSERT INTO pools (id) VALUES (1)");
            try (var result = statement.executeQuery("SELECT revision FROM pools WHERE id = 1")) {
                assertThat(result.next()).isTrue();
                assertThat(result.getLong("revision")).isZero();
                assertThat(result.wasNull()).isFalse();
            }

            statement.executeUpdate("""
                    INSERT INTO event_outbox (
                        event_id, event_type, schema_version, producer, ordering_key, aggregate_version,
                        occurred_at, exchange_name, v1_routing_key, v1_payload, v1_payload_type,
                        v2_enabled, v2_routing_key, v2_payload
                    ) VALUES (
                        '%s', 'POOL_PROJECTION_CHANGED', '2.0.0', 'pools-service', 'pool:1', 0,
                        CURRENT_TIMESTAMP, 'entity.lifecycle.exchange', NULL, NULL, NULL,
                        TRUE, 'pool.projection-changed.v2', JSON '{}'
                    )
                    """.formatted(UUID.fromString("d8c91431-687c-4f30-ab3d-8f1cce8eef83")));
            try (var result = statement.executeQuery("SELECT count(*) FROM event_outbox")) {
                assertThat(result.next()).isTrue();
                assertThat(result.getLong(1)).isOne();
            }
        }
    }
}
