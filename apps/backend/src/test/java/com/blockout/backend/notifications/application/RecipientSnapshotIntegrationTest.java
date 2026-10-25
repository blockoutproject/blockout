package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import jakarta.persistence.EntityManagerFactory;
import java.sql.Timestamp;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
import org.hibernate.SessionFactory;
import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Actual F06/F07 snapshot boundary with committed turnover between separate origin statements. */
@SpringBootTest(
    properties =
        "spring.jpa.properties.hibernate.session_factory.statement_inspector=com.blockout.backend.notifications.application.RecipientSnapshotIntegrationTest$TurnoverInspector")
@DisplayName("Atomic F06 recipient union during origin turnover")
@Testcontainers
class RecipientSnapshotIntegrationTest extends ContributionScenario {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private TurnoverInspector inspector;
  @Autowired private EntityManagerFactory entityManagerFactory;

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

  /** Selects the SQL interleaving hook owned by this suite's actual Hibernate factory. */
  @BeforeEach
  void selectInspector() {
    inspector =
        (TurnoverInspector)
            entityManagerFactory
                .unwrap(SessionFactory.class)
                .getSessionFactoryOptions()
                .getStatementInspector();
  }

  /** Clears only this test's SQL interleaving callback after the owned scenario. */
  @AfterEach
  void clearHook() {
    inspector.hook = null;
  }

  @Test
  @DisplayName("A continuously nonempty audience cannot disappear between origin reads")
  void retainsARealAudienceSnapshot() {
    // Given
    moderator(AUTHOR);
    sql.update(
        "UPDATE sporting_match SET reliable_start=? WHERE id=?",
        Timestamp.from(NOW.plusSeconds(60)),
        matchId);
    submit(AUTHOR, "0", "https://youtube.com/advance", true);
    follow(FOLLOWER);
    when(clock.instant()).thenReturn(NOW.plusSeconds(90));
    UUID team =
        sql.queryForObject(
            "SELECT home_team_id FROM sporting_match WHERE id=?", UUID.class, matchId);
    FollowContext poolFollow =
        new FollowContext(
            FOLLOWER, new FollowContext.Target(FollowContext.TargetType.POOL, scope.pool()));
    FollowContext teamFollow =
        new FollowContext(OTHER, new FollowContext.Target(FollowContext.TargetType.TEAM, team));
    TransactionTemplate independent = new TransactionTemplate(transactions);
    independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    AtomicInteger stage = new AtomicInteger();
    inspector.hook =
        statement -> {
          String query = statement.toLowerCase(Locale.ROOT).stripLeading();
          if (!query.startsWith("select")) return;
          boolean teamOnly = query.contains("team_follow") && !query.contains("pool_follow");
          boolean poolOnly = query.contains("pool_follow") && !query.contains("team_follow");
          if ((stage.get() == 0 || stage.get() == 2) && poolOnly) {
            // A team follow is confirmed before the previous pool follow is removed.
            independent.executeWithoutResult(status -> follows.replace(teamFollow, true));
            independent.executeWithoutResult(status -> follows.replace(poolFollow, false));
            stage.incrementAndGet();
          } else if (stage.get() == 1 && teamOnly) {
            independent.executeWithoutResult(status -> follows.replace(poolFollow, true));
            independent.executeWithoutResult(status -> follows.replace(teamFollow, false));
            stage.incrementAndGet();
          }
        };

    // When
    due.run();

    // Then
    assertThat(count("notification")).isEqualTo(1);
    assertThat(
            sql.queryForObject(
                "SELECT live_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                matchId))
        .isTrue();
  }

  /**
   * Native Hibernate test hook: rotates committed follows only between separate origin statements.
   * A combined SQL union has no such inter-statement boundary. Reentrant follow-command SQL is
   * excluded; the actual repositories/services and PostgreSQL remain real.
   */
  public static class TurnoverInspector implements StatementInspector {
    private static final long serialVersionUID = 1L;
    private volatile Consumer<String> hook;
    private final AtomicBoolean inspecting = new AtomicBoolean();

    /**
     * Invokes the bounded test interleaving before execution without changing SQL or its values.
     *
     * @param sql original Hibernate-generated statement
     * @return unchanged SQL
     */
    @Override
    public String inspect(String sql) {
      Consumer<String> callback = hook;
      if (callback != null && inspecting.compareAndSet(false, true)) {
        try {
          callback.accept(sql);
        } finally {
          inspecting.set(false);
        }
      }
      return sql;
    }
  }
}
