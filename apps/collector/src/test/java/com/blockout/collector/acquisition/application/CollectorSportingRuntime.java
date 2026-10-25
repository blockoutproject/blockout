package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.blockout.collector.ingestion.IngestionTestClient;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/**
 * Suite-owned executable backend and local signing keys. Only identity and provider inputs are
 * controlled; generated HTTP, security, F01/F02 services and PostgreSQL commits remain real.
 */
final class CollectorSportingRuntime implements AutoCloseable {
  private final HttpServer keys;
  private final RSAKey signingKey;
  private final String issuer;
  private final String baseUrl;
  private final Process backend;
  final JdbcTemplate sql;

  /**
   * Starts the already packaged backend against an explicitly supplied disposable migrated
   * database.
   *
   * @throws Exception if local keys, startup or the database connection cannot be established
   */
  CollectorSportingRuntime() throws Exception {
    String databaseUrl = required("qualification.database-url");
    String databaseUser = required("qualification.database-user");
    String databasePassword = required("qualification.database-password");
    sql =
        new JdbcTemplate(new DriverManagerDataSource(databaseUrl, databaseUser, databasePassword));
    Path jar = Path.of(required("qualification.backend-jar")).toAbsolutePath();
    assertThat(jar).isRegularFile();
    int port = Integer.parseInt(required("qualification.backend-port"));
    baseUrl = "http://127.0.0.1:" + port;
    Path log = Path.of("target", "collector-sporting-backend.log");
    Files.createDirectories(log.getParent());
    signingKey = new RSAKeyGenerator(2048).keyID("collector-sporting-local").generate();
    keys = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    keys.createContext(
        "/.well-known/jwks.json",
        exchange -> {
          byte[] json =
              new JWKSet(signingKey.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.sendResponseHeaders(200, json.length);
          exchange.getResponseBody().write(json);
          exchange.close();
        });
    keys.start();
    issuer = "http://127.0.0.1:" + keys.getAddress().getPort() + "/";
    ProcessBuilder process =
        new ProcessBuilder(
            Path.of(System.getProperty("java.home"), "bin", "java").toString(),
            "-Xmx384m",
            "-jar",
            jar.toString(),
            "--server.address=127.0.0.1",
            "--server.port=" + port,
            "--spring.datasource.url=" + databaseUrl,
            "--spring.datasource.username=" + databaseUser,
            "--spring.datasource.password=" + databasePassword,
            "--blockout.security.issuer=" + issuer,
            "--blockout.security.mobile-audience=local-mobile",
            "--blockout.security.mobile-client-id=local-mobile",
            "--blockout.security.ingestion-audience=local-ingestion",
            "--blockout.security.ingestion-client-id=local-collector",
            "--blockout.notifications.link-announcements-cron=-");
    try {
      backend = process.redirectErrorStream(true).redirectOutput(log.toFile()).start();
    } catch (java.io.IOException failure) {
      keys.stop(0);
      throw failure;
    }
    try (HttpClient health = HttpClient.newHttpClient()) {
      await()
          .atMost(Duration.ofSeconds(45))
          .until(
              () -> {
                assertThat(backend.isAlive()).as("Backend startup; inspect %s", log).isTrue();
                try {
                  return health
                          .send(
                              HttpRequest.newBuilder(URI.create(baseUrl + "/health"))
                                  .timeout(Duration.ofSeconds(1))
                                  .build(),
                              HttpResponse.BodyHandlers.discarding())
                          .statusCode()
                      == 200;
                } catch (java.io.IOException unavailable) {
                  return false;
                }
              });
    } catch (Throwable failure) {
      close();
      throw failure;
    }
  }

  /**
   * Uses the existing production-configured pool/converters, with a native test interceptor for
   * response loss or observation. No backend result is fabricated.
   *
   * @param interceptor controlled request/response boundary
   * @return caller-owned authenticated client and its connection pool
   */
  IngestionTestClient connect(ClientHttpRequestInterceptor interceptor) {
    Instant now = Instant.now();
    String token =
        new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(signingKey)))
            .encode(
                JwtEncoderParameters.from(
                    JwsHeader.with(SignatureAlgorithm.RS256).keyId(signingKey.getKeyID()).build(),
                    JwtClaimsSet.builder()
                        .issuer(issuer)
                        .subject("local-collector@clients")
                        .audience(List.of("local-ingestion"))
                        .issuedAt(now)
                        .expiresAt(now.plusSeconds(600))
                        .claim("azp", "local-collector")
                        .claim("scope", "sporting:ingest")
                        .build()))
            .getTokenValue();
    IngestionTestClient transport = IngestionTestClient.connect(baseUrl, interceptor);
    transport.api().setBearerToken(token);
    return transport;
  }

  /**
   * Requires explicit operational inputs; this opt-in suite has no production or default database.
   *
   * @param name required JVM property
   * @return supplied value
   */
  private static String required(String name) {
    String value = System.getProperty(name);
    if (value == null || value.isBlank()) throw new IllegalArgumentException("Missing " + name);
    return value;
  }

  /**
   * Stops only the backend process and key listener created by this suite.
   *
   * @throws Exception if waiting for owned process termination is interrupted
   */
  @Override
  public void close() throws Exception {
    try {
      backend.destroy();
      if (!backend.waitFor(10, TimeUnit.SECONDS)) {
        backend.destroyForcibly();
        assertThat(backend.waitFor(10, TimeUnit.SECONDS)).isTrue();
      }
    } finally {
      keys.stop(0);
    }
  }
}
