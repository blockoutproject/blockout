package com.blockout.backend.jobs.infrastructure.persistence;

import com.blockout.backend.jobs.application.PublicationResult;
import java.util.*;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
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
  @Container
  protected static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:17-alpine");

  protected static JdbcTemplate sql;
  protected static TransactionTemplate tx;
  protected static PostgresJobRepository jobs;
  protected static PostgresJobPublisher publisher;

  @BeforeAll
  protected static void setup() throws Exception {
    var ds = new DriverManagerDataSource(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword());
    sql = new JdbcTemplate(ds);
    tx = new TransactionTemplate(new JdbcTransactionManager(ds));
    try (var c = ds.getConnection()) {
      c.createStatement()
          .execute(
              "CREATE SCHEMA operations; CREATE ROLE blockout_api LOGIN PASSWORD 'test'; CREATE ROLE blockout_worker LOGIN PASSWORD 'test'; GRANT USAGE ON SCHEMA operations TO blockout_api, blockout_worker");
      try (var lb =
          new Liquibase(
              "db/changelog/db.changelog-master.xml",
              new ClassLoaderResourceAccessor(),
              new JdbcConnection(c))) {
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

  UUID publish(String key) {
    return ((PublicationResult.Accepted)
            tx.execute(s -> publisher.publish("test", 1, key, Map.of("value", 1))))
        .id();
  }

  void expire() {
    sql.update("UPDATE operations.jobs SET lease_expires_at=clock_timestamp()-interval '1 second'");
  }

  String state() {
    return sql.queryForObject("SELECT state FROM operations.jobs", String.class);
  }

  int count() {
    return sql.queryForObject("SELECT count(*) FROM operations.jobs", Integer.class);
  }
}
