package com.blockout.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Qualifies the real main-port Actuator probe and bounded PostgreSQL failure over HTTP. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@DisplayName("Native readiness with PostgreSQL")
class HealthIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  @LocalServerPort private int port;

  /**
   * Migrates the disposable baseline, then supplies application-role credentials for startup.
   *
   * @param properties test context's native external configuration registry
   * @throws Exception if the explicit migration fails
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  @Test
  @DisplayName("Reports aggregate readiness from the actual application port")
  void servesMainPortReadiness() throws Exception {
    // Given
    try (HttpClient client =
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build()) {
      // When
      HttpResponse<String> response = client.send(probe(), HttpResponse.BodyHandlers.ofString());

      // Then
      assertThat(response.statusCode()).isEqualTo(200);
      assertThat(response.body()).isEqualTo("{\"status\":\"UP\"}");
    }
  }

  @Test
  @DisplayName("Returns bounded aggregate-only failure when PostgreSQL stops responding")
  void boundsUnresponsiveDatabase() throws Exception {
    // Given
    try (HttpClient client =
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build()) {
      assertThat(client.send(probe(), HttpResponse.BodyHandlers.ofString()).statusCode())
          .isEqualTo(200);
      DATABASE.getDockerClient().pauseContainerCmd(DATABASE.getContainerId()).exec();
      try {
        // When
        HttpResponse<String> response = client.send(probe(), HttpResponse.BodyHandlers.ofString());

        // Then
        assertThat(response.statusCode()).isEqualTo(503);
        assertThat(response.body()).isEqualTo("{\"status\":\"DOWN\"}");
      } finally {
        DATABASE.getDockerClient().unpauseContainerCmd(DATABASE.getContainerId()).exec();
      }
    }
  }

  /**
   * Builds the anonymous main-port probe with a caller-side bound beyond the configured DB waits.
   *
   * @return GET request without credentials, component selection or diagnostic overrides
   */
  private HttpRequest probe() {
    return HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/health"))
        .timeout(Duration.ofSeconds(10))
        .GET()
        .build();
  }
}
