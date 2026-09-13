package com.blockout.backend.jobs.infrastructure.persistence;

import static org.assertj.core.api.Assertions.*;

import com.blockout.backend.jobs.application.PublicationResult;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Verifies owner-transaction publication and PostgreSQL JSONB deduplication semantics. */
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
    PublicationResult a =
        tx.execute(_ -> publisher.publish("test", 1, "a", Map.of("a", 1, "b", 2)));
    Map<String, Integer> reversed = new LinkedHashMap<>();
    reversed.put("b", 2);
    reversed.put("a", 1);

    PublicationResult b = tx.execute(_ -> publisher.publish("test", 1, "a", reversed));

    assertThat(b).isEqualTo(a);

    assertThat(count()).isEqualTo(1);
  }

  @Test
  void comparesNestedValuesWithoutLosingNumericPrecision() {
    PublicationResult first =
        tx.execute(
            _ ->
                publisher.publish(
                    "test",
                    1,
                    "nested",
                    Map.of(
                        "items",
                        List.of(
                            Map.of(
                                "n",
                                new java.math.BigDecimal("12345678901234567890.123456789"))))));
    PublicationResult repeated =
        tx.execute(
            _ ->
                publisher.publish(
                    "test",
                    1,
                    "nested",
                    Map.of(
                        "items",
                        List.of(
                            Map.of(
                                "n",
                                new java.math.BigDecimal("12345678901234567890.1234567890"))))));
    PublicationResult changed =
        tx.execute(
            _ ->
                publisher.publish(
                    "test",
                    1,
                    "nested",
                    Map.of(
                        "items",
                        List.of(
                            Map.of(
                                "n",
                                new java.math.BigDecimal("12345678901234567890.123456788"))))));

    assertThat(repeated).isEqualTo(first);
    assertThat(changed).isEqualTo(new PublicationResult.Conflict());
  }

  @Test
  void changedVersionConflictsWithTheSamePayload() {
    tx.executeWithoutResult(_ -> publisher.publish("test", 1, "versioned", Map.of()));

    PublicationResult result = tx.execute(_ -> publisher.publish("test", 2, "versioned", Map.of()));

    assertThat(result).isEqualTo(new PublicationResult.Conflict());
  }

  @Test
  void rejectsOversizedPayload() {
    PublicationResult result =
        tx.execute(_ -> publisher.publish("test", 1, "a", Map.of("text", "x".repeat(65536))));

    assertThat(result)
        .isEqualTo(
            new PublicationResult.Rejected(PublicationResult.RejectionCode.PAYLOAD_TOO_LARGE));

    assertThat(count()).isZero();
  }

  @Test
  void concurrentPublishersReuseOneIdentity()
      throws InterruptedException, ExecutionException, TimeoutException {
    CyclicBarrier barrier = new CyclicBarrier(2);
    try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
      Callable<UUID> publish =
          () -> {
            barrier.await();
            return publish("same");
          };
      Future<UUID> first = pool.submit(publish);
      Future<UUID> second = pool.submit(publish);
      assertThat(first.get(10, TimeUnit.SECONDS)).isEqualTo(second.get(10, TimeUnit.SECONDS));
      assertThat(count()).isEqualTo(1);
    }
  }

  @Test
  void changedContentConflictsWithoutReplacingWork() {
    PublicationResult original =
        tx.execute(_ -> publisher.publish("test", 1, "a", Map.of("value", 1)));

    PublicationResult conflict =
        tx.execute(_ -> publisher.publish("test", 1, "a", Map.of("value", 2)));

    assertThat(conflict).isEqualTo(new PublicationResult.Conflict());
    PublicationResult unchanged =
        tx.execute(_ -> publisher.publish("test", 1, "a", Map.of("value", 1)));

    assertThat(unchanged).isEqualTo(original);

    assertThat(count()).isEqualTo(1);
  }

  @Test
  void equivalentNumberScaleReusesIdentity() {
    PublicationResult first = tx.execute(_ -> publisher.publish("test", 1, "a", Map.of("n", 1)));

    PublicationResult repeated =
        tx.execute(
            _ -> publisher.publish("test", 1, "a", Map.of("n", new java.math.BigDecimal("1.00"))));

    assertThat(repeated).isEqualTo(first);
  }

  @Test
  void arrayOrderRemainsSignificant() {
    tx.executeWithoutResult(_ -> publisher.publish("test", 1, "a", List.of(1, 2)));

    PublicationResult result = tx.execute(_ -> publisher.publish("test", 1, "a", List.of(2, 1)));

    assertThat(result).isEqualTo(new PublicationResult.Conflict());
  }

  @Test
  void rejectsMultibytePayloadByUtf8Size() {
    PublicationResult result =
        tx.execute(_ -> publisher.publish("test", 1, "a", Map.of("text", "é".repeat(32768))));

    assertThat(result)
        .isEqualTo(
            new PublicationResult.Rejected(PublicationResult.RejectionCode.PAYLOAD_TOO_LARGE));

    assertThat(count()).isZero();
  }

  @Test
  void unrelatedDatasourceTransactionDoesNotAuthorizePublication() {
    DriverManagerDataSource otherDatasource =
        new DriverManagerDataSource(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword());
    TransactionTemplate otherTx =
        new TransactionTemplate(new JdbcTransactionManager(otherDatasource));

    assertThatThrownBy(() -> otherTx.execute(_ -> publisher.publish("test", 1, "a", Map.of())))
        .isInstanceOf(IllegalStateException.class);

    assertThat(count()).isZero();
  }

  @Test
  void republishingAfterSuccessRetentionCreatesNewIdentity() {
    UUID original = publish("retained");
    jobs.completeWithEffect(jobs.claim(java.time.Duration.ofMinutes(1)).orElseThrow(), () -> {});
    sql.update("UPDATE operations.jobs SET finished_at=clock_timestamp()-interval '8 days'");
    jobs.cleanup();

    UUID republished = publish("retained");

    assertThat(republished).isNotEqualTo(original);
    assertThat(count()).isEqualTo(1);
  }
}
