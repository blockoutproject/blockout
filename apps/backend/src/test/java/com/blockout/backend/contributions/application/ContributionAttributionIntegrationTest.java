package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real JPA replacement against controlled original-account row erasure; no F05 orchestrator claim.
 */
@DisplayName("Contribution attribution account locking")
@Testcontainers
class ContributionAttributionIntegrationTest extends ContributionScenario {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();

  /**
   * Migrates this suite's disposable database before wiring its real application services.
   *
   * @param properties native Spring datasource properties for this container
   * @throws Exception if role initialization or the production migration fails
   */
  @DynamicPropertySource
  static void database(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /** {@inheritDoc} */
  @Override
  protected PostgreSQLContainer databaseContainer() {
    return DATABASE;
  }

  @Test
  @DisplayName("Replacing an erased nonfollowing owner waits before loading mutable attribution")
  void waitsForPreviousOwnerErasure() throws Exception {
    // Given
    UUID original = submit(FOLLOWER, "0", "https://youtube.com/original", false).version().id();
    moderator(AUTHOR);
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          tx.execute(
              status -> {
                sql.queryForObject(
                    "SELECT id FROM account WHERE id=? FOR UPDATE", UUID.class, FOLLOWER);
                Future<?> future =
                    worker.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  submit(AUTHOR, "1", "https://youtube.com/selected", true);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                assertThat(future.isDone())
                    .as("Publication must wait for the previous original account")
                    .isFalse();
                sql.update("DELETE FROM account WHERE id=?", FOLLOWER);
                return future;
              });

      // When
      waiting.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(contributions.active(matchId).orElseThrow().ownerId()).isEqualTo(AUTHOR);
      assertThat(contributions.version(original).orElseThrow().ownerId()).isNull();
      assertThat(contributions.version(original).orElseThrow().publication().actorId()).isNull();
    }
  }

  @Test
  @DisplayName("All retained decision actors enter the sorted account union before publication")
  void waitsForRetainedDecisionActor() throws Exception {
    // Given: retained approval attribution is distinct from its still-present owner.
    UUID original = submit(FOLLOWER, "0", "https://youtube.com/original", false).version().id();
    sql.update(
        "UPDATE contribution_version SET publication_actor_id=?,publication_kind='APPROVAL' WHERE id=?",
        OTHER,
        original);
    moderator(AUTHOR);
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    TransactionTemplate independent = new TransactionTemplate(transactions);
    independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          tx.execute(
              status -> {
                sql.queryForObject(
                    "SELECT id FROM account WHERE id=? FOR UPDATE", UUID.class, OTHER);
                Future<?> future =
                    worker.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  submit(AUTHOR, "1", "https://youtube.com/selected", true);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                assertThat(future.isDone())
                    .as("Publication must wait for the retained decision actor")
                    .isFalse();
                assertThatThrownBy(
                        () ->
                            independent.execute(
                                inner ->
                                    sql.queryForObject(
                                        "SELECT id FROM account WHERE id=? FOR UPDATE NOWAIT",
                                        UUID.class,
                                        FOLLOWER)))
                    .isInstanceOf(org.springframework.dao.DataAccessException.class);
                sql.update("DELETE FROM account WHERE id=?", OTHER);
                return future;
              });

      // When
      waiting.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(contributions.active(matchId).orElseThrow().ownerId()).isEqualTo(AUTHOR);
      assertThat(contributions.version(original).orElseThrow().ownerId()).isEqualTo(FOLLOWER);
      assertThat(contributions.version(original).orElseThrow().publication().actorId()).isNull();
    }
  }
}
