package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.notifications.application.ProcessDueLinkAnnouncements;
import com.blockout.backend.sporting.application.service.ChangeDivisionLifecycle;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.sql.Timestamp;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Actual division lifecycle racing the three real announcement producers on migrated PostgreSQL.
 */
@DisplayName("Sporting root order during division deactivation")
@Testcontainers
class ContributionSportingLocksIntegrationTest extends ContributionScenario {
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

  @Autowired private ChangeDivisionLifecycle divisions;
  @Autowired private ProcessDueLinkAnnouncements.ProcessDueMatch dueMatch;

  @ParameterizedTest
  @ValueSource(strings = {"submission", "due", "result"})
  @DisplayName("Division deactivation waits behind the producer before any account-lock wait")
  void serializesDivisionActivity(String producer) throws Exception {
    // Given
    if (producer.equals("due")) {
      moderator(AUTHOR);
      sql.update(
          "UPDATE sporting_match SET reliable_start=? WHERE id=?",
          Timestamp.from(NOW.plusSeconds(60)),
          matchId);
      submit(AUTHOR, "0", "https://youtube.com/advance", true);
      when(clock.instant()).thenReturn(NOW.plusSeconds(90));
    }
    follow(FOLLOWER);
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'division-lifecycle.manage')",
        OTHER);
    CompletableFuture<Integer> producerPid = new CompletableFuture<>();
    CompletableFuture<Integer> divisionPid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?>[] waiting =
          tx.execute(
              status -> {
                sql.queryForObject(
                    "SELECT id FROM account WHERE id=? FOR UPDATE", UUID.class, FOLLOWER);
                Future<?> publication =
                    workers.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  producerPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  switch (producer) {
                                    case "submission" ->
                                        submit(AUTHOR, "0", "https://youtube.com/current", false);
                                    case "due" -> dueMatch.process(matchId);
                                    case "result" -> result(2, ResultStateEnum.FINAL);
                                    default ->
                                        throw new IllegalArgumentException("Unknown test producer");
                                  }
                                }));
                PostgresTestDatabase.awaitBlocked(sql, producerPid);
                Future<?> deactivation =
                    workers.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  divisionPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  divisions.setActive(
                                      OTHER, SportingIngestionFixture.DIVISION, "0", false);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, divisionPid);
                assertThat(deactivation.isDone())
                    .as("The division must remain stable while the producer waits for accounts")
                    .isFalse();
                return new Future<?>[] {publication, deactivation};
              });

      // When
      waiting[0].get(15, TimeUnit.SECONDS);
      waiting[1].get(15, TimeUnit.SECONDS);

      // Then
      assertThat(
              sql.queryForObject(
                  "SELECT active FROM sporting_division WHERE id=?",
                  Boolean.class,
                  SportingIngestionFixture.DIVISION))
          .isFalse();
      assertThat(count("notification")).isEqualTo(1);
    }
  }
}
