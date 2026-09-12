package com.blockout.backend.migrations;

import static org.assertj.core.api.Assertions.*;

import java.sql.*;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.lockservice.LockServiceFactory;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.*;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

@Testcontainers
class MigrationIntegrationTest {
  @Container static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:17-alpine");

  @BeforeAll
  static void roles() throws Exception {
    try (var c = connect()) {
      c.createStatement()
          .execute(
              "CREATE ROLE blockout_api LOGIN PASSWORD 'test'; CREATE ROLE blockout_worker LOGIN PASSWORD 'test'");
    }
  }

  @BeforeEach
  void schema() throws Exception {
    try (var c = connect()) {
      c.createStatement()
          .execute(
              "DROP SCHEMA IF EXISTS operations CASCADE; DROP TABLE IF EXISTS public.databasechangelog; DROP TABLE IF EXISTS public.databasechangeloglock; CREATE SCHEMA operations; GRANT USAGE ON SCHEMA operations TO blockout_api, blockout_worker");
    }
  }

  static Connection connect() throws SQLException {
    return DriverManager.getConnection(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword());
  }

  Liquibase liquibase(String file) throws Exception {
    return new Liquibase(file, new ClassLoaderResourceAccessor(), new JdbcConnection(connect()));
  }

  void migrate() throws Exception {
    try (var lb = liquibase("db/changelog/db.changelog-master.xml")) {
      lb.update("");
    }
  }

  @Test
  void repeatedMigrationKeepsOneAppliedBaseline() throws Exception {
    migrate();

    migrate();

    try (var c = connect()) {
      var rs = c.createStatement().executeQuery("SELECT count(*) FROM databasechangelog");
      rs.next();
      assertThat(rs.getInt(1)).isEqualTo(1);
      var generation =
          c.createStatement()
              .executeQuery("SELECT generation FROM operations.schema_metadata WHERE id=1");
      generation.next();
      assertThat(generation.getInt(1)).isEqualTo(1);
    }
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(strings = {"blockout_api", "blockout_worker"})
  void runtimeRoleCannotCreateTables(String role) throws Exception {
    migrate();

    try (var c = DriverManager.getConnection(DB.getJdbcUrl(), role, "test")) {
      assertThatThrownBy(
              () -> c.createStatement().execute("CREATE TABLE operations.forbidden(id int)"))
          .isInstanceOfSatisfying(
              SQLException.class, failure -> assertThat(failure.getSQLState()).isEqualTo("42501"));
    }
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(strings = {"blockout_api", "blockout_worker"})
  void runtimeRoleCannotChangeSchemaGeneration(String role) throws Exception {
    migrate();

    try (var c = DriverManager.getConnection(DB.getJdbcUrl(), role, "test")) {
      assertThatThrownBy(
              () ->
                  c.createStatement().execute("UPDATE operations.schema_metadata SET generation=2"))
          .isInstanceOfSatisfying(
              SQLException.class, failure -> assertThat(failure.getSQLState()).isEqualTo("42501"));
    }
  }

  @Test
  void rejectsChangedAppliedHistory() throws Exception {
    migrate();
    try (var c = connect()) {
      c.createStatement()
          .execute("UPDATE databasechangelog SET md5sum='9:00000000000000000000000000000000'");
    }
    try (var lb = liquibase("db/changelog/db.changelog-master.xml")) {
      assertThatThrownBy(() -> lb.update(""))
          .isInstanceOf(liquibase.exception.LiquibaseException.class);
    }
  }

  @Test
  void refusesAnAlreadyHeldMigrationLock() throws Exception {
    migrate();
    try (var c = connect()) {
      c.createStatement()
          .execute(
              "UPDATE databasechangeloglock SET locked=true,lockgranted=clock_timestamp(),lockedby='controlled-test'");
    }
    try (var lb = liquibase("db/changelog/test-evolution.xml")) {
      LockServiceFactory.getInstance().getLockService(lb.getDatabase()).setChangeLogLockWaitTime(0);
      assertThatThrownBy(() -> lb.update(""))
          .isInstanceOf(liquibase.exception.LiquibaseException.class);
    }
  }

  @Test
  void appliesAnAdditiveTestOnlyEvolution() throws Exception {
    migrate();
    try (var lb = liquibase("db/changelog/test-evolution.xml")) {
      lb.update("");
      lb.update("");
    }
    try (var c = connect()) {
      assertThat(
              c.createStatement()
                  .executeQuery("SELECT note FROM operations.evolution_probe")
                  .getMetaData()
                  .getColumnCount())
          .isEqualTo(1);
    }
  }

  @Test
  void rollsBackAnInvalidChangeset() throws Exception {
    migrate();
    try (var lb = liquibase("db/changelog/test-invalid.xml")) {
      assertThatThrownBy(() -> lb.update(""))
          .isInstanceOf(liquibase.exception.LiquibaseException.class);
    }
    try (var c = connect()) {
      var rs = c.createStatement().executeQuery("SELECT to_regclass('operations.invalid_probe')");
      rs.next();
      assertThat(rs.getString(1)).isNull();
    }
  }
}
