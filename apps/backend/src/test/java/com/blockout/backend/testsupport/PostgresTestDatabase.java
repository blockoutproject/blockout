package com.blockout.backend.testsupport;

import static org.awaitility.Awaitility.await;

import java.sql.Connection;
import java.sql.DriverManager;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import liquibase.Contexts;
import liquibase.LabelExpression;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.MountableFile;

/** Supplies disposable PostgreSQL with the repository's actual application and migration roles. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class PostgresTestDatabase {
  /**
   * Creates a container whose lifecycle is owned by the calling test's native Testcontainers
   * support.
   *
   * @return unstarted PostgreSQL 18.6 container with harmless, isolated role credentials
   */
  public static PostgreSQLContainer create() {
    return new PostgreSQLContainer("postgres:18.6")
        .withDatabaseName("postgres")
        .withUsername("postgres")
        .withPassword("harmless-admin")
        .withEnv("BLOCKOUT_APP_PASSWORD", "harmless-app")
        .withEnv("BLOCKOUT_MIGRATION_PASSWORD", "harmless-migration")
        .withCopyFileToContainer(
            MountableFile.forClasspathResource("init-roles.sql"),
            "/docker-entrypoint-initdb.d/10-blockout.sql");
  }

  /**
   * Applies the real disposable baseline explicitly before application startup.
   *
   * @param database caller-owned running test container
   * @throws Exception if migration credentials or the actual changelog fail
   */
  public static void migrate(PostgreSQLContainer database) throws Exception {
    try (Connection connection =
            DriverManager.getConnection(
                database.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Liquibase liquibase =
            new Liquibase(
                "db/changelog/db.changelog-master.xml",
                new ClassLoaderResourceAccessor(),
                new JdbcConnection(connection))) {
      liquibase.update(new Contexts(), new LabelExpression());
    }
  }

  /**
   * Supplies the restricted application connection to the calling suite's Spring context.
   *
   * @param database caller-owned running container, already migrated explicitly
   * @param properties native test configuration registry
   */
  public static void registerApplicationProperties(
      PostgreSQLContainer database, DynamicPropertyRegistry properties) {
    properties.add(
        "spring.datasource.url", () -> database.getJdbcUrl().replace("/postgres", "/blockout"));
    properties.add("spring.datasource.username", () -> "blockout_app");
    properties.add("spring.datasource.password", () -> "harmless-app");
  }

  /**
   * Observes actual PostgreSQL exclusion before the caller releases its conflicting transaction.
   *
   * @param sql connection to the same disposable database
   * @param backendPid connection identity supplied before the contending lock attempt
   */
  public static void awaitBlocked(JdbcTemplate sql, CompletableFuture<Integer> backendPid) {
    int pid = backendPid.orTimeout(10, TimeUnit.SECONDS).join();
    await()
        .atMost(Duration.ofSeconds(10))
        .until(
            () ->
                Boolean.TRUE.equals(
                    sql.queryForObject(
                        "SELECT cardinality(pg_blocking_pids(?)) > 0", Boolean.class, pid)));
  }
}
