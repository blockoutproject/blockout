package com.blockout.backend.testsupport;

import static org.awaitility.Awaitility.await;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
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
   * Creates a container for Spring-managed tests or an explicitly owned native JUnit fixture. This
   * factory does not start, stop or share the returned container.
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
   * Supplies separate application and startup-migration connections to the calling Spring context.
   *
   * @param database caller-owned running container initialized with the repository's roles
   * @param properties native test configuration registry
   */
  public static void registerApplicationProperties(
      PostgreSQLContainer database, DynamicPropertyRegistry properties) {
    properties.add(
        "spring.datasource.url", () -> database.getJdbcUrl().replace("/postgres", "/blockout"));
    properties.add("spring.datasource.username", () -> "blockout_app");
    properties.add("spring.datasource.password", () -> "harmless-app");
    properties.add(
        "spring.liquibase.url", () -> database.getJdbcUrl().replace("/postgres", "/blockout"));
    properties.add("spring.liquibase.user", () -> "blockout_migration");
    properties.add("spring.liquibase.password", () -> "harmless-migration");
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
