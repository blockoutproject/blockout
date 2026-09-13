package com.blockout.backend.migrations;

import static org.assertj.core.api.Assertions.*;

import java.sql.*;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.LiquibaseException;
import liquibase.lockservice.LockServiceFactory;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.*;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Exercises the production XML baseline, privilege separation and controlled test-only evolutions.
 */
@Testcontainers
class MigrationIntegrationTest {
  @AutoClose final ClassLoaderResourceAccessor resources = new ClassLoaderResourceAccessor();
  @Container static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:17-alpine");

  @BeforeAll
  static void roles() throws SQLException {
    try (Connection c = connect();
        Statement statement = c.createStatement()) {
      statement.execute(
          "CREATE ROLE blockout_api LOGIN PASSWORD 'test'; CREATE ROLE blockout_worker LOGIN PASSWORD 'test'");
    }
  }

  /**
   * Recreates only the disposable test schemas and Liquibase history for an independent scenario.
   */
  @BeforeEach
  void schema() throws SQLException {
    try (Connection c = connect();
        Statement statement = c.createStatement()) {
      statement.execute(
          "DROP SCHEMA IF EXISTS operations CASCADE; DROP SCHEMA IF EXISTS identity CASCADE; DROP SCHEMA IF EXISTS sports CASCADE; DROP TABLE IF EXISTS public.databasechangelog; DROP TABLE IF EXISTS public.databasechangeloglock; CREATE SCHEMA operations; CREATE SCHEMA identity; CREATE SCHEMA sports; GRANT USAGE ON SCHEMA sports, identity, operations TO blockout_api, blockout_worker");
    }
  }

  /**
   * Opens an administrator connection to the test container; the caller must close it.
   *
   * @return the owned test JDBC connection
   */
  static Connection connect() throws SQLException {
    return DriverManager.getConnection(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword());
  }

  /** Applies the actual production XML baseline and closes its JDBC/Liquibase resources. */
  void migrate() throws SQLException, LiquibaseException {
    try (JdbcConnection connection = new JdbcConnection(connect());
        Liquibase lb =
            new Liquibase("db/changelog/db.changelog-master.xml", resources, connection)) {
      lb.update("");
    }
  }

  @Test
  void repeatedMigrationKeepsOneAppliedBaseline() throws SQLException, LiquibaseException {
    migrate();

    migrate();

    try (Connection c = connect();
        Statement statement = c.createStatement()) {
      try (ResultSet rs = statement.executeQuery("SELECT count(*) FROM databasechangelog")) {
        rs.next();
        assertThat(rs.getInt(1)).isEqualTo(1);
      }
      try (ResultSet generation =
          statement.executeQuery("SELECT generation FROM operations.schema_metadata WHERE id=1")) {
        generation.next();
        assertThat(generation.getInt(1)).isEqualTo(5);
      }
    }
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(strings = {"blockout_api", "blockout_worker"})
  void runtimeRoleCannotCreateTables(String role) throws SQLException, LiquibaseException {
    migrate();

    try (Connection c = DriverManager.getConnection(DB.getJdbcUrl(), role, "test");
        Statement statement = c.createStatement()) {
      assertThatThrownBy(() -> statement.execute("CREATE TABLE operations.forbidden(id int)"))
          .isInstanceOfSatisfying(
              SQLException.class, failure -> assertThat(failure.getSQLState()).isEqualTo("42501"));
    }
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(strings = {"blockout_api", "blockout_worker"})
  void runtimeRoleCannotChangeSchemaGeneration(String role)
      throws SQLException, LiquibaseException {
    migrate();

    try (Connection c = DriverManager.getConnection(DB.getJdbcUrl(), role, "test");
        Statement statement = c.createStatement()) {
      assertThatThrownBy(
              () -> statement.execute("UPDATE operations.schema_metadata SET generation=5"))
          .isInstanceOfSatisfying(
              SQLException.class, failure -> assertThat(failure.getSQLState()).isEqualTo("42501"));
    }
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(strings = {"blockout_api", "blockout_worker"})
  void runtimeRoleCannotCreateIdentityTables(String role) throws SQLException, LiquibaseException {
    migrate();
    try (Connection c = DriverManager.getConnection(DB.getJdbcUrl(), role, "test");
        Statement statement = c.createStatement()) {
      assertThatThrownBy(() -> statement.execute("CREATE TABLE identity.forbidden(id int)"))
          .isInstanceOfSatisfying(
              SQLException.class, e -> assertThat(e.getSQLState()).isEqualTo("42501"));
    }
  }

  @Test
  void workerCannotCreateBusinessUsers() throws SQLException, LiquibaseException {
    migrate();
    try (Connection c = DriverManager.getConnection(DB.getJdbcUrl(), "blockout_worker", "test");
        Statement statement = c.createStatement()) {
      try (ResultSet result = statement.executeQuery("SELECT count(*) FROM identity.users")) {
        assertThat(result.next()).isTrue();
      }
      assertThatThrownBy(
              () ->
                  statement.execute(
                      "INSERT INTO identity.users(id,pseudo,pseudo_key,active,created_at,updated_at) VALUES (gen_random_uuid(),'user','user',true,now(),now())"))
          .isInstanceOfSatisfying(
              SQLException.class, e -> assertThat(e.getSQLState()).isEqualTo("42501"));
    }
  }

  @Test
  void rejectsChangedAppliedHistory() throws SQLException, LiquibaseException {
    migrate();
    try (Connection c = connect();
        Statement statement = c.createStatement()) {
      statement.execute("UPDATE databasechangelog SET md5sum='9:00000000000000000000000000000000'");
    }
    try (JdbcConnection connection = new JdbcConnection(connect());
        Liquibase lb =
            new Liquibase("db/changelog/db.changelog-master.xml", resources, connection)) {
      assertThatThrownBy(() -> lb.update(""))
          .isInstanceOf(liquibase.exception.LiquibaseException.class);
    }
  }

  @Test
  void refusesAnAlreadyHeldMigrationLock() throws SQLException, LiquibaseException {
    migrate();
    try (Connection c = connect();
        Statement statement = c.createStatement()) {
      statement.execute(
          "UPDATE databasechangeloglock SET locked=true,lockgranted=clock_timestamp(),lockedby='controlled-test'");
    }
    try (JdbcConnection connection = new JdbcConnection(connect());
        Liquibase lb = new Liquibase("db/changelog/test-evolution.xml", resources, connection)) {
      LockServiceFactory.getInstance().getLockService(lb.getDatabase()).setChangeLogLockWaitTime(0);
      assertThatThrownBy(() -> lb.update(""))
          .isInstanceOf(liquibase.exception.LiquibaseException.class);
    }
  }

  @Test
  void appliesAnAdditiveTestOnlyEvolution() throws SQLException, LiquibaseException {
    migrate();
    try (JdbcConnection connection = new JdbcConnection(connect());
        Liquibase lb = new Liquibase("db/changelog/test-evolution.xml", resources, connection)) {
      lb.update("");
      lb.update("");
    }
    try (Connection c = connect();
        Statement statement = c.createStatement()) {
      try (ResultSet result =
          statement.executeQuery("SELECT note FROM operations.evolution_probe")) {
        assertThat(result.getMetaData().getColumnCount()).isEqualTo(1);
      }
    }
  }

  @Test
  void rollsBackAnInvalidChangeset() throws SQLException, LiquibaseException {
    migrate();
    try (JdbcConnection connection = new JdbcConnection(connect());
        Liquibase lb = new Liquibase("db/changelog/test-invalid.xml", resources, connection)) {
      assertThatThrownBy(() -> lb.update(""))
          .isInstanceOf(liquibase.exception.LiquibaseException.class);
    }
    try (Connection c = connect();
        Statement statement = c.createStatement()) {
      try (ResultSet rs =
          statement.executeQuery("SELECT to_regclass('operations.invalid_probe')")) {
        rs.next();
        assertThat(rs.getString(1)).isNull();
      }
    }
  }
}
