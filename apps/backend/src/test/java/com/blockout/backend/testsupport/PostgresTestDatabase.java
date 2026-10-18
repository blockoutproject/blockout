package com.blockout.backend.testsupport;

import java.sql.Connection;
import java.sql.DriverManager;
import liquibase.Contexts;
import liquibase.LabelExpression;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
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
}
