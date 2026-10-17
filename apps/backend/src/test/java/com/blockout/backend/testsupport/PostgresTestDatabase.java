package com.blockout.backend.testsupport;

import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.MountableFile;

/** Supplies disposable PostgreSQL with the repository's actual application and migration roles. */
public final class PostgresTestDatabase {
  /** Prevents instantiation of this module-owned container setup. */
  private PostgresTestDatabase() {}

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
}
