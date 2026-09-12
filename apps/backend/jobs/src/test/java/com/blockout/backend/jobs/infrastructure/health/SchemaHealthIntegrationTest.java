package com.blockout.backend.jobs.infrastructure.health;

import static org.assertj.core.api.Assertions.*;

import com.blockout.backend.jobs.infrastructure.persistence.PostgresJobsFixture;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.testcontainers.junit.jupiter.*;

class SchemaHealthIntegrationTest extends PostgresJobsFixture {
  @Test
  void compatibleSchemaIsReady() {
    var health = new SchemaHealthIndicator(sql);

    assertThat(health.health().getStatus().getCode()).isEqualTo("UP");
  }

  @Test
  void incompatibleSchemaIsNotReady() {
    var health = new SchemaHealthIndicator(sql);
    sql.update("UPDATE operations.schema_metadata SET generation=2");

    try {
      assertThat(health.health().getStatus().getCode()).isEqualTo("DOWN");
    } finally {
      sql.update("UPDATE operations.schema_metadata SET generation=1");
    }
  }

  @Test
  void missingQueueIsNotReady() {
    var health = new SchemaHealthIndicator(sql);

    tx.executeWithoutResult(
        status -> {
          sql.execute("DROP TABLE operations.jobs");

          assertThat(health.health().getStatus().getCode()).isEqualTo("DOWN");
          status.setRollbackOnly();
        });
  }
}
