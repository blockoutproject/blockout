package com.blockout.backend.testsupport;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Owns PostgreSQL with the Spring context so connection pools and application consumers close
 * before their database. The native registrar migrates eagerly before application beans are
 * created, then supplies restricted application credentials rather than container-admin access.
 */
@TestConfiguration(proxyBeanMethods = false)
public class PostgresTestConfiguration {
  /**
   * Declares the disposable container whose startup and shutdown Spring Boot manages.
   *
   * @return an unstarted container using the repository's actual role initialization
   */
  @Bean
  PostgreSQLContainer postgresDatabase() {
    return PostgresTestDatabase.create();
  }

  /**
   * Migrates the running container before registering its restricted application connection.
   *
   * @param database container already started by Spring Boot's Testcontainers lifecycle
   * @return native eager registrar supplying only this context's application connection
   * @throws Exception if role initialization or the production migration fails
   */
  @Bean
  DynamicPropertyRegistrar postgresProperties(PostgreSQLContainer database) throws Exception {
    PostgresTestDatabase.migrate(database);
    return properties -> PostgresTestDatabase.registerApplicationProperties(database, properties);
  }
}
