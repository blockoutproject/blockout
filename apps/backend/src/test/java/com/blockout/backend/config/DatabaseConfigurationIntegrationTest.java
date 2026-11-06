package com.blockout.backend.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.BackendApplication;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import com.blockout.testsupport.persistence.StartupFixture;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import javax.sql.DataSource;
import liquibase.Contexts;
import liquibase.LabelExpression;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Proves startup and role separation against disposable PostgreSQL using the actual local role
 * script.
 */
@Testcontainers
@DisplayName("Startup database migration and application role separation")
class DatabaseConfigurationIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();

  @Test
  @DisplayName("Migrates an empty schema before starting the real HTTP application")
  void migratesBeforeStartup() throws Exception {
    // Given
    createSchema("migrated");

    // When
    try (ConfigurableApplicationContext context =
        startApplication("migrated", "db/changelog/database-startup.xml")) {
      // Then
      assertThat(((WebServerApplicationContext) context).getWebServer().getPort()).isPositive();
      try (Connection connection = context.getBean(DataSource.class).getConnection()) {
        assertThat(connection.getMetaData().getUserName()).isEqualTo("blockout_app");
      }
    }
  }

  @Test
  @DisplayName("Allows application credentials to insert, update and delete migrated data")
  void allowsApplicationDataWrites() throws Exception {
    // Given
    createSchema("writable");
    migrate("writable", "db/changelog/database-fixture.xml");
    try (Connection connection = applicationConnection("writable");
        Statement sql = connection.createStatement()) {
      // When
      int inserted =
          sql.executeUpdate("INSERT INTO startup_fixture(id, label) VALUES (1, 'safe fixture')");
      int updated = sql.executeUpdate("UPDATE startup_fixture SET label = 'updated' WHERE id = 1");
      int deleted = sql.executeUpdate("DELETE FROM startup_fixture WHERE id = 1");

      // Then
      assertThat(inserted).isEqualTo(1);
      assertThat(updated).isEqualTo(1);
      assertThat(deleted).isEqualTo(1);
    }
  }

  @Test
  @DisplayName("Refuses startup when the migrated schema does not match application mappings")
  void rejectsIncompatibleSchema() throws Exception {
    // Given
    createSchema("missing");

    // When / Then
    assertThatThrownBy(
            () -> startApplication("missing", "db/changelog/database-fixture.xml").close())
        .hasStackTraceContaining("Schema validation: missing table");
    try (Connection connection = applicationConnection("missing");
        Statement sql = connection.createStatement();
        ResultSet tables =
            sql.executeQuery(
                "SELECT COUNT(*) FROM information_schema.tables"
                    + " WHERE table_schema = 'missing' AND table_name = 'access_settings'")) {
      assertThat(tables.next()).isTrue();
      assertThat(tables.getInt(1)).isZero();
    }
  }

  @Test
  @DisplayName("Refuses startup after a failed migration while retaining earlier committed data")
  void rejectsFailedMigration() throws Exception {
    // Given
    createSchema("failed");
    migrate("failed", "db/changelog/database-fixture.xml");
    try (Connection connection = applicationConnection("failed");
        Statement sql = connection.createStatement()) {
      sql.executeUpdate("INSERT INTO startup_fixture(id, label) VALUES (1, 'retained')");
    }

    // When / Then
    assertThatThrownBy(
            () -> startApplication("failed", "db/changelog/database-startup-failure.xml").close())
        .hasStackTraceContaining("intentional-startup-failure");
    try (Connection connection = applicationConnection("failed");
        Statement sql = connection.createStatement();
        ResultSet state =
            sql.executeQuery(
                "SELECT (SELECT label FROM startup_fixture WHERE id = 1),"
                    + " (SELECT COUNT(*) FROM databasechangelog WHERE id <> 'fixture'),"
                    + " (SELECT COUNT(*) FROM databasechangelog"
                    + " WHERE id = 'intentional-startup-failure'),"
                    + " (SELECT locked FROM databasechangeloglock WHERE id = 1)")) {
      assertThat(state.next()).isTrue();
      assertThat(state.getString(1)).isEqualTo("retained");
      assertThat(state.getInt(2)).isPositive();
      assertThat(state.getInt(3)).isZero();
      assertThat(state.getBoolean(4)).isFalse();
    }
  }

  @ParameterizedTest(name = "{0}")
  @CsvSource(
      delimiter = '|',
      textBlock =
          """
      create | CREATE TABLE forbidden(id bigint)
      alter  | ALTER TABLE startup_fixture ADD COLUMN forbidden text
      """)
  @DisplayName("Denies application schema writes")
  void refusesApplicationDdl(String operation, String statement) throws Exception {
    // Given
    String schema = "restricted_" + operation;
    createSchema(schema);
    migrate(schema, "db/changelog/database-fixture.xml");
    try (Connection connection = applicationConnection(schema);
        Statement sql = connection.createStatement()) {
      // When / Then
      assertThatThrownBy(() -> sql.execute(statement))
          .isInstanceOfSatisfying(
              SQLException.class,
              sqlFailure -> assertThat(sqlFailure.getSQLState()).isEqualTo("42501"));
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
      sql.execute(
          "ALTER DEFAULT PRIVILEGES IN SCHEMA "
              + schema
              + " GRANT USAGE, SELECT ON SEQUENCES TO blockout_app");
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
   * @param schema isolated schema for startup migration and Hibernate validation
   * @param changelog classpath XML entry point selected by the scenario
   * @return a caller-owned running application context
   */
  private ConfigurableApplicationContext startApplication(String schema, String changelog) {
    return new SpringApplicationBuilder(BackendApplication.class, FixtureConfiguration.class)
        .run(
            "--server.port=0",
            "--spring.datasource.url=" + url(schema),
            "--spring.datasource.username=blockout_app",
            "--spring.datasource.password=harmless-app",
            "--spring.liquibase.url=" + url(schema),
            "--spring.liquibase.user=blockout_migration",
            "--spring.liquibase.password=harmless-migration",
            "--spring.liquibase.change-log=classpath:" + changelog,
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

  /** Adds the fixture while retaining all application mappings for their native repositories. */
  @TestConfiguration(proxyBeanMethods = false)
  @EntityScan(basePackageClasses = {StartupFixture.class, BackendApplication.class})
  static class FixtureConfiguration {}
}
