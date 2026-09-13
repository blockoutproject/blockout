package com.blockout.backend.jobs.infrastructure.health;

import static org.assertj.core.api.Assertions.*;

import com.blockout.backend.jobs.infrastructure.persistence.PostgresJobsFixture;
import org.junit.jupiter.api.*;

class SchemaHealthIntegrationTest extends PostgresJobsFixture {
  @Test
  void compatibleSchemaIsReady() {
    var health = new SchemaHealthIndicator(sql);

    assertThat(health.health().getStatus().getCode()).isEqualTo("UP");
  }

  @Test
  void incompatibleSchemaIsNotReady() {
    var health = new SchemaHealthIndicator(sql);
    sql.update("UPDATE operations.schema_metadata SET generation=4");

    try {
      assertThat(health.health().getStatus().getCode()).isEqualTo("DOWN");
    } finally {
      sql.update("UPDATE operations.schema_metadata SET generation=3");
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
