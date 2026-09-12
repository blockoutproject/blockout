package com.blockout.backend.jobs.infrastructure.persistence;

import static org.assertj.core.api.Assertions.*;

import com.blockout.backend.jobs.application.PublicationResult;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;

class JobPublisherIntegrationTest extends PostgresJobsFixture {
  @Test
  void requiresAnOwnerTransaction() {
    assertThatThrownBy(() -> publisher.publish("test", 1, "a", Map.of()))
        .isInstanceOf(IllegalStateException.class);
  }

  @Test
  void rollsBackPublicationWithOwner() {
    tx.executeWithoutResult(
        s -> {
          publisher.publish("test", 1, "a", Map.of());
          s.setRollbackOnly();
        });

    assertThat(count()).isZero();
  }

  @Test
  void deduplicatesCanonicalContent() {
    var a = tx.execute(s -> publisher.publish("test", 1, "a", Map.of("a", 1, "b", 2)));
    var reversed = new LinkedHashMap<String, Integer>();
    reversed.put("b", 2);
    reversed.put("a", 1);

    var b = tx.execute(s -> publisher.publish("test", 1, "a", reversed));

    assertThat(b).isEqualTo(a);

    assertThat(count()).isEqualTo(1);
  }

  @Test
  void rejectsOversizedPayload() {
    var result =
        tx.execute(s -> publisher.publish("test", 1, "a", Map.of("text", "x".repeat(65536))));

    assertThat(result).isEqualTo(new PublicationResult.Rejected("PAYLOAD_TOO_LARGE"));

    assertThat(count()).isZero();
  }

  @Test
  void concurrentPublishersReuseOneIdentity() throws Exception {
    var barrier = new CyclicBarrier(2);
    try (var pool = Executors.newFixedThreadPool(2)) {
      Callable<UUID> publish =
          () -> {
            barrier.await();
            return publish("same");
          };
      var first = pool.submit(publish);
      var second = pool.submit(publish);
      assertThat(first.get(10, TimeUnit.SECONDS)).isEqualTo(second.get(10, TimeUnit.SECONDS));
      assertThat(count()).isEqualTo(1);
    }
  }

  @Test
  void changedContentConflictsWithoutReplacingWork() {
    var original = tx.execute(s -> publisher.publish("test", 1, "a", Map.of("value", 1)));

    var conflict = tx.execute(s -> publisher.publish("test", 1, "a", Map.of("value", 2)));

    assertThat(conflict).isEqualTo(new PublicationResult.Conflict());
    var unchanged = tx.execute(s -> publisher.publish("test", 1, "a", Map.of("value", 1)));

    assertThat(unchanged).isEqualTo(original);

    assertThat(count()).isEqualTo(1);
  }

  @Test
  void equivalentNumberScaleReusesIdentity() {
    var first = tx.execute(s -> publisher.publish("test", 1, "a", Map.of("n", 1)));

    var repeated =
        tx.execute(
            s -> publisher.publish("test", 1, "a", Map.of("n", new java.math.BigDecimal("1.00"))));

    assertThat(repeated).isEqualTo(first);
  }

  @Test
  void arrayOrderRemainsSignificant() {
    tx.executeWithoutResult(s -> publisher.publish("test", 1, "a", List.of(1, 2)));

    var result = tx.execute(s -> publisher.publish("test", 1, "a", List.of(2, 1)));

    assertThat(result).isEqualTo(new PublicationResult.Conflict());
  }

  @Test
  void rejectsMultibytePayloadByUtf8Size() {
    var result =
        tx.execute(s -> publisher.publish("test", 1, "a", Map.of("text", "é".repeat(32768))));

    assertThat(result).isEqualTo(new PublicationResult.Rejected("PAYLOAD_TOO_LARGE"));

    assertThat(count()).isZero();
  }

  @Test
  void unrelatedDatasourceTransactionDoesNotAuthorizePublication() {
    var otherDatasource =
        new DriverManagerDataSource(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword());
    var otherTx = new TransactionTemplate(new JdbcTransactionManager(otherDatasource));

    assertThatThrownBy(() -> otherTx.execute(s -> publisher.publish("test", 1, "a", Map.of())))
        .isInstanceOf(IllegalStateException.class);

    assertThat(count()).isZero();
  }
}
