package com.blockout.backend.jobs.infrastructure.persistence;

import com.blockout.backend.jobs.application.PublicationResult;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.*;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.LiquibaseException;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.json.JsonMapper;

/**
 * Runs the production Liquibase baseline for each persistence scenario family on real PostgreSQL.
 */
@Testcontainers
public abstract class PostgresJobsFixture {
  @AutoClose static ClassLoaderResourceAccessor resources;

  @Container
  protected static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:17-alpine");

  protected static JdbcTemplate sql;
  protected static TransactionTemplate tx;
  protected static PostgresJobRepository jobs;
  protected static PostgresJobPublisher publisher;

  /**
   * Creates isolated test roles and applies the production Liquibase baseline once per test family.
   */
  @BeforeAll
  protected static void setup() throws SQLException, LiquibaseException {
    resources = new ClassLoaderResourceAccessor();
    DriverManagerDataSource ds =
        new DriverManagerDataSource(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword());
    sql = new JdbcTemplate(ds);
    tx = new TransactionTemplate(new JdbcTransactionManager(ds));
    try (Connection c = ds.getConnection();
        Statement statement = c.createStatement()) {
      statement.execute(
          "CREATE SCHEMA operations; CREATE SCHEMA identity; CREATE SCHEMA sports; CREATE ROLE blockout_api LOGIN PASSWORD 'test'; CREATE ROLE blockout_worker LOGIN PASSWORD 'test'; GRANT USAGE ON SCHEMA sports, identity, operations TO blockout_api, blockout_worker");
      try (JdbcConnection connection = new JdbcConnection(c);
          Liquibase lb =
              new Liquibase("db/changelog/db.changelog-master.xml", resources, connection)) {
        lb.update("");
      }
    }
    jobs = new PostgresJobRepository(sql, tx);
    publisher = new PostgresJobPublisher(sql, new JsonMapper());
  }

  @BeforeEach
  protected void clean() {
    sql.execute("TRUNCATE operations.jobs");
  }

  /**
   * Publishes a fixed test payload inside its owner transaction.
   *
   * @param key scenario-specific deduplication key
   * @return the accepted durable job identity
   */
  UUID publish(String key) {
    return ((PublicationResult.Accepted)
            tx.execute(_ -> publisher.publish("test", 1, key, Map.of("value", 1))))
        .id();
  }

  /** Moves current leases into the past using SQL so recovery does not depend on sleeping. */
  void expire() {
    sql.update("UPDATE operations.jobs SET lease_expires_at=clock_timestamp()-interval '1 second'");
  }

  /**
   * Reads the queue state in scenarios deliberately retaining exactly one row.
   *
   * @return the single persisted job state
   */
  String state() {
    return sql.queryForObject("SELECT state FROM operations.jobs", String.class);
  }

  /**
   * Counts durable publications to detect duplicate writes and unexpected side effects.
   *
   * @return the number of retained jobs
   */
  int count() {
    return sql.queryForObject("SELECT count(*) FROM operations.jobs", Integer.class);
  }
}
