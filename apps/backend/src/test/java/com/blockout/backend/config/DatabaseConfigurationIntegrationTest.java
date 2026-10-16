package com.blockout.backend.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.BackendApplication;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import liquibase.Contexts;
import liquibase.LabelExpression;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.MountableFile;

/**
 * Proves startup and role separation against disposable PostgreSQL using the actual local role
 * script.
 */
@Testcontainers
@DisplayName("Explicit database migration and application startup")
class DatabaseConfigurationIntegrationTest {
  @Container
  private static final PostgreSQLContainer DATABASE =
      new PostgreSQLContainer("postgres:18.6")
          .withDatabaseName("postgres")
          .withUsername("postgres")
          .withPassword("harmless-admin")
          .withEnv("BLOCKOUT_APP_PASSWORD", "harmless-app")
          .withEnv("BLOCKOUT_MIGRATION_PASSWORD", "harmless-migration")
          .withCopyFileToContainer(
              MountableFile.forClasspathResource("init-roles.sql"),
              "/docker-entrypoint-initdb.d/10-blockout.sql");

  @Test
  @DisplayName(
      "Starts the real HTTP application after explicit migration with application credentials")
  void startsAfterMigration() throws Exception {
    // Given
    createSchema("migrated");
    migrate("migrated", "db/changelog/db.changelog-master.xml");
    migrate("migrated", "db/changelog/database-fixture.xml");

    // When
    try (ConfigurableApplicationContext context = startApplication("migrated")) {
      // Then
      assertThat(((WebServerApplicationContext) context).getWebServer().getPort()).isPositive();
      assertThat(context.containsBean("liquibase")).isFalse();
      try (Connection connection = applicationConnection("migrated");
          Statement sql = connection.createStatement()) {
        assertThat(
                sql.executeUpdate(
                    "INSERT INTO startup_fixture(id, label) VALUES (1, 'safe fixture')"))
            .isEqualTo(1);
        assertThat(sql.executeUpdate("UPDATE startup_fixture SET label = 'updated' WHERE id = 1"))
            .isEqualTo(1);
        assertThat(sql.executeUpdate("DELETE FROM startup_fixture WHERE id = 1")).isEqualTo(1);
      }
    }
  }

  @Test
  @DisplayName("Refuses startup when a mapped table is missing without initializing its schema")
  void rejectsMissingSchema() throws Exception {
    // Given
    createSchema("missing");

    // When / Then
    assertThatThrownBy(() -> startApplication("missing"))
        .hasStackTraceContaining("Schema validation: missing table [startup_fixture]");
    try (Connection connection = applicationConnection("missing");
        Statement sql = connection.createStatement();
        ResultSet tables =
            sql.executeQuery(
                "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'missing'")) {
      assertThat(tables.next()).isTrue();
      assertThat(tables.getInt(1)).isZero();
    }
  }

  @Test
  @DisplayName("Application credentials cannot create or alter schema objects")
  void refusesApplicationDdl() throws Exception {
    // Given
    createSchema("restricted");
    migrate("restricted", "db/changelog/database-fixture.xml");

    // When / Then
    try (Connection connection = applicationConnection("restricted");
        Statement sql = connection.createStatement()) {
      assertThatThrownBy(() -> sql.execute("CREATE TABLE forbidden(id bigint)"))
          .isInstanceOf(SQLException.class)
          .extracting("SQLState")
          .isEqualTo("42501");
      assertThatThrownBy(() -> sql.execute("ALTER TABLE startup_fixture ADD COLUMN forbidden text"))
          .isInstanceOf(SQLException.class)
          .extracting("SQLState")
          .isEqualTo("42501");
    }
  }

  /**
   * Creates an isolated schema as its migration owner, granting only the local application policy.
   *
   * @param schema constant test-owned schema name, never external input
   * @throws SQLException if isolated role setup fails
   */
  private void createSchema(String schema) throws SQLException {
    try (Connection connection =
            DriverManager.getConnection(url(schema), "blockout_migration", "harmless-migration");
        Statement sql = connection.createStatement()) {
      sql.execute("CREATE SCHEMA " + schema);
      sql.execute("GRANT USAGE ON SCHEMA " + schema + " TO blockout_app");
      sql.execute(
          "ALTER DEFAULT PRIVILEGES IN SCHEMA "
              + schema
              + " GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO blockout_app");
    }
  }

  /**
   * Runs the same Liquibase engine explicitly, before starting any application context.
   *
   * @param schema isolated schema owned by the migration role
   * @param changelog classpath XML entry point
   * @throws Exception if the migration cannot complete
   */
  private void migrate(String schema, String changelog) throws Exception {
    try (Connection connection =
            DriverManager.getConnection(url(schema), "blockout_migration", "harmless-migration");
        Liquibase liquibase =
            new Liquibase(
                changelog, new ClassLoaderResourceAccessor(), new JdbcConnection(connection))) {
      liquibase.update(new Contexts(), new LabelExpression());
    }
  }

  /**
   * Starts the production entry point with only test-owned connection and entity inputs.
   *
   * @param schema isolated schema to validate
   * @return a caller-owned running application context
   */
  private ConfigurableApplicationContext startApplication(String schema) {
    return new SpringApplicationBuilder(BackendApplication.class, FixtureConfiguration.class)
        .run(
            "--server.port=0",
            "--spring.datasource.url=" + url(schema),
            "--spring.datasource.username=blockout_app",
            "--spring.datasource.password=harmless-app",
            "--spring.liquibase.change-log=classpath:db/changelog/database-fixture.xml",
            "--spring.main.banner-mode=off");
  }

  /**
   * Opens the restricted connection used to verify DML and forbidden DDL.
   *
   * @param schema isolated test schema
   * @return connection to close after assertions
   * @throws SQLException if the application role cannot connect
   */
  private Connection applicationConnection(String schema) throws SQLException {
    return DriverManager.getConnection(url(schema), "blockout_app", "harmless-app");
  }

  /**
   * Selects a per-test schema without changing the shared disposable container's database.
   *
   * @param schema isolated test schema
   * @return JDBC URL for the explicitly provisioned Blockout database
   */
  private String url(String schema) {
    return DATABASE.getJdbcUrl().replace("/postgres", "/blockout") + "&currentSchema=" + schema;
  }

  /** Adds a fixture mapping exclusively to the explicitly constructed test application contexts. */
  @TestConfiguration(proxyBeanMethods = false)
  @EntityScan(basePackageClasses = StartupFixture.class)
  static class FixtureConfiguration {}

  /** No production entity/table is introduced before its owning feature is implemented. */
  @Entity
  @Table(name = "startup_fixture")
  static class StartupFixture {
    @Id private Long id;
    private String label;

    /** Allows Hibernate to instantiate this isolated validation fixture. */
    protected StartupFixture() {}
  }
}
