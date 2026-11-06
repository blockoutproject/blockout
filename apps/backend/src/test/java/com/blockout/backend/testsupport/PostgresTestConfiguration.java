package com.blockout.backend.testsupport;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Owns PostgreSQL with the Spring context so connection pools and application consumers close
 * before their database. The native registrar supplies restricted application credentials and a
 * separate migration owner for Spring Boot's startup Liquibase integration.
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
   * Registers the running container's separate application and startup-migration connections.
   *
   * @param database container already started by Spring Boot's Testcontainers lifecycle
   * @return native eager registrar supplying only this context's isolated connections
   */
  @Bean
  DynamicPropertyRegistrar postgresProperties(PostgreSQLContainer database) {
    return properties -> PostgresTestDatabase.registerApplicationProperties(database, properties);
  }
}
