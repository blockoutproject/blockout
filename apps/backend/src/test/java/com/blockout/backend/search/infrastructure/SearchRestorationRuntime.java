package com.blockout.backend.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.blockout.backend.testsupport.PostgresTestDatabase;
import com.github.dockerjava.api.command.InspectContainerResponse.Mount;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.testcontainers.containers.Container.ExecResult;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.MountableFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Owns the F04 packaged process and disposable fixtures; archives and process logs remain ignored.
 */
final class SearchRestorationRuntime implements AutoCloseable {
  private final Path jar =
      Path.of(System.getProperty("qualification.backend-jar", "target/backend-0.0.0-SNAPSHOT.jar"))
          .toAbsolutePath();
  private final Path output = Path.of("target", "search-restoration-" + UUID.randomUUID());
  private final PostgreSQLContainer source = PostgresTestDatabase.create();
  private final PostgreSQLContainer restored =
      PostgresTestDatabase.create()
          .withPassword("harmless-restore-admin")
          .withEnv("BLOCKOUT_APP_PASSWORD", "harmless-restore-app")
          .withEnv("BLOCKOUT_MIGRATION_PASSWORD", "harmless-restore-migration");
  private final SearchTestEngine nativeEngine = new SearchTestEngine();
  private final HttpClient http = HttpClient.newHttpClient();
  private final JsonMapper json = JsonMapper.builder().build();
  private final int port;
  private RSAKey signingKey;
  private HttpServer keys;
  private PostgreSQLContainer database = source;
  private String applicationPassword = "harmless-app";
  private String migrationPassword = "harmless-migration";
  private Process backend;
  private int incarnation;
  final OpenSearchClient engine;
  final String prefix = "blockout-local-search-351-" + UUID.randomUUID();
  JdbcTemplate sql;

  /**
   * Starts the existing disposable database/engine fixtures and a local issuer for real HTTP edits.
   *
   * @throws Exception if the packaged JAR, fixture startup or local identity keys are unavailable
   */
  SearchRestorationRuntime() throws Exception {
    try {
      assertThat(jar).isRegularFile();
      Files.createDirectories(output);
      try (ServerSocket available = new ServerSocket()) {
        available.bind(new InetSocketAddress("127.0.0.1", 0));
        port = available.getLocalPort();
      }
      source.start();
      sql =
          new JdbcTemplate(
              new DriverManagerDataSource(databaseUrl(), "blockout_app", applicationPassword));
      nativeEngine.startEngine();
      engine = nativeEngine.client;
      signingKey = new RSAKeyGenerator(2048).keyID("search-restoration-local").generate();
      keys = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
      keys.createContext(
          "/.well-known/jwks.json",
          exchange -> {
            byte[] body =
                new JWKSet(signingKey.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
          });
      keys.start();
    } catch (Exception | AssertionError failure) {
      try {
        close();
      } catch (Exception | AssertionError cleanup) {
        failure.addSuppressed(cleanup);
      }
      throw failure;
    }
  }

  /**
   * Applies the shared fixture's real migration chain to the disposable source before seeding.
   *
   * @throws Exception if the normal migration owner cannot initialize the source
   */
  void migrate() throws Exception {
    PostgresTestDatabase.migrate(source);
    assertThat(sql.queryForObject("SELECT count(*) FROM sporting_club", Integer.class)).isZero();
  }

  /**
   * Opens a migration-owner connection on the currently selected source or restored database.
   *
   * @return caller-owned connection; the scenario owns any transaction and lock
   * @throws Exception if the active disposable database is inaccessible
   */
  Connection migrationConnection() throws Exception {
    return DriverManager.getConnection(databaseUrl(), "blockout_migration", migrationPassword);
  }

  /**
   * Returns the active fixture's mapped application database, without inherited connection inputs.
   */
  private String databaseUrl() {
    return database.getJdbcUrl().replace("/postgres", "/blockout");
  }

  /**
   * Starts one packaged serving writer; secrets use its environment and logs remain ignored.
   *
   * @param indexPrefix isolated source or restored alias namespace
   * @param delay native completion-based rebuild delay for this incarnation
   * @throws Exception when the owned port is occupied or startup fails
   */
  void start(String indexPrefix, String delay) throws Exception {
    assertThat(backend == null || !backend.isAlive()).isTrue();
    try (java.net.ServerSocket probe = new java.net.ServerSocket()) {
      probe.bind(new InetSocketAddress("127.0.0.1", port));
    }
    Path log = output.resolve("backend-" + ++incarnation + ".log");
    ProcessBuilder builder =
        new ProcessBuilder(
            Path.of(System.getProperty("java.home"), "bin", "java").toString(),
            "-Xmx384m",
            "-jar",
            jar.toString(),
            "--server.address=127.0.0.1",
            "--server.port=" + port,
            "--spring.datasource.hikari.data-source-properties.ApplicationName=search-restoration-serving");
    Map<String, String> environment = builder.environment();
    environment.clear();
    environment.put("PATH", System.getenv("PATH"));
    environment.put("SPRING_DATASOURCE_URL", databaseUrl());
    environment.put("SPRING_DATASOURCE_USERNAME", "blockout_app");
    environment.put("SPRING_DATASOURCE_PASSWORD", applicationPassword);
    environment.put("BLOCKOUT_SECURITY_ISSUER", issuer());
    environment.put("BLOCKOUT_SECURITY_MOBILE_AUDIENCE", "local-mobile");
    environment.put("BLOCKOUT_SECURITY_MOBILE_CLIENT_ID", "local-mobile");
    environment.put("BLOCKOUT_SECURITY_INGESTION_AUDIENCE", "local-ingestion");
    environment.put("BLOCKOUT_SECURITY_INGESTION_CLIENT_ID", "local-collector");
    environment.put("BLOCKOUT_SEARCH_ENABLED", "true");
    environment.put("BLOCKOUT_SEARCH_INDEX_PREFIX", indexPrefix);
    environment.put("BLOCKOUT_SEARCH_PROJECTION_FULL_REBUILD_DELAY", delay);
    environment.put("BLOCKOUT_NOTIFICATIONS_RETENTION_CRON", "-");
    environment.put("BLOCKOUT_NOTIFICATIONS_LINK_ANNOUNCEMENTS_CRON", "-");
    nativeEngine.registerBackendEnvironment(environment);
    backend = builder.redirectErrorStream(true).redirectOutput(log.toFile()).start();
    await()
        .atMost(Duration.ofSeconds(45))
        .until(
            () -> {
              assertThat(backend.isAlive())
                  .as("Serving process; inspect ignored log %s", log)
                  .isTrue();
              try {
                return request("/health").statusCode() == 200;
              } catch (java.io.IOException unavailable) {
                return false;
              }
            });
  }

  /**
   * Kills the actual serving process, discarding its scheduler queue before the next incarnation.
   *
   * @throws Exception if that owned process does not terminate
   */
  void crash() throws Exception {
    assertThat(backend).isNotNull();
    backend.destroyForcibly();
    assertThat(backend.waitFor(10, TimeUnit.SECONDS)).isTrue();
  }

  /**
   * Reads the actual public HTTP boundary with a short request bound and no identity provider.
   *
   * @param path encoded backend path and query
   * @return the unmodified HTTP response
   * @throws Exception on connection, cancellation or timeout failure
   */
  HttpResponse<String> request(String path) throws Exception {
    return http.send(
        HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
            .timeout(Duration.ofSeconds(5))
            .build(),
        HttpResponse.BodyHandlers.ofString());
  }

  /**
   * Reads a successful no-store public collection through its generated endpoint.
   *
   * @param path explicit collection query
   * @param resource clubs, teams or pools
   * @return the actual collection items
   * @throws Exception on transport or JSON failure
   */
  JsonNode results(String path, String resource) throws Exception {
    HttpResponse<String> response = request(path);
    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(response.headers().firstValue("Cache-Control")).contains("no-store");
    return json.readTree(response.body()).path(resource);
  }

  /**
   * Commits a current contact edit through the real authenticated owner, thereby queueing work.
   *
   * @param club synthetic club identity
   * @param city new effective city for the queued-current-value scenario
   * @throws Exception if the current read or generated PATCH is refused
   */
  void changeCity(UUID club, String city) throws Exception {
    String path = "/administration/clubs/" + club + "/contacts";
    String token = token();
    HttpResponse<String> current =
        http.send(
            HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(Duration.ofSeconds(5))
                .header("Authorization", "Bearer " + token)
                .build(),
            HttpResponse.BodyHandlers.ofString());
    assertThat(current.statusCode()).isEqualTo(200);
    String revision = json.readTree(current.body()).path("revision").asText();
    String body =
        json.writeValueAsString(
            Map.of("revision", revision, "city", Map.of("mode", "manual", "value", city)));
    HttpResponse<String> changed =
        http.send(
            HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(Duration.ofSeconds(5))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(body))
                .build(),
            HttpResponse.BodyHandlers.ofString());
    assertThat(changed.statusCode()).isEqualTo(200);
  }

  /** Returns the suite-owned local issuer used by synthetic account fixtures and signed edits. */
  String issuer() {
    return "http://127.0.0.1:" + keys.getAddress().getPort() + "/";
  }

  /** Returns a short-lived local operator token; current business permissions remain SQL-owned. */
  private String token() {
    Instant now = Instant.now();
    return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(signingKey)))
        .encode(
            JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).keyId(signingKey.getKeyID()).build(),
                JwtClaimsSet.builder()
                    .issuer(issuer())
                    .subject("search-restoration-operator")
                    .audience(List.of("local-mobile"))
                    .issuedAt(now)
                    .expiresAt(now.plusSeconds(600))
                    .claim("azp", "local-mobile")
                    .build()))
        .getTokenValue();
  }

  /**
   * Creates a real custom-format PostgreSQL dump, gzips it and retains its binary archive locally.
   *
   * @return ignored synthetic archive, preserved after fixture cleanup
   * @throws Exception if native dump, gzip or the binary copy fails
   */
  Path dump() throws Exception {
    assertThat(backend == null || !backend.isAlive()).isTrue();
    execute(
        source,
        "dump.log",
        "pg_dump",
        "--format=custom",
        "--no-owner",
        "--no-acl",
        "--username=blockout_migration",
        "--dbname=blockout",
        "--file=/tmp/source.dump");
    execute(source, "gzip.log", "gzip", "/tmp/source.dump");
    Path archive = output.resolve("source.dump.gz");
    source.copyFileFromContainer("/tmp/source.dump.gz", archive.toString());
    assertThat(Files.size(archive)).isPositive();
    return archive;
  }

  /**
   * Stops and preserves the source while restoring the archive into independent empty storage. Uses
   * the destination's distinct credentials and reapplies application grants before reopening.
   *
   * @param archive successful native source archive
   * @throws Exception if source isolation, restoration or ACL reapplication fails
   */
  void restore(Path archive) throws Exception {
    assertThat(backend == null || !backend.isAlive()).isTrue();
    source.getDockerClient().stopContainerCmd(source.getContainerId()).exec();
    assertThat(source.getCurrentContainerInfo().getState().getRunning()).isFalse();
    restored.start();
    assertThat(postgresVolume(source)).isNotEqualTo(postgresVolume(restored));
    database = restored;
    applicationPassword = "harmless-restore-app";
    migrationPassword = "harmless-restore-migration";
    sql =
        new JdbcTemplate(
            new DriverManagerDataSource(databaseUrl(), "blockout_app", applicationPassword));
    assertThat(
            sql.queryForObject(
                "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'", Integer.class))
        .isZero();
    restored.copyFileToContainer(MountableFile.forHostPath(archive), "/tmp/source.dump.gz");
    execute(restored, "gzip-check.log", "gzip", "-t", "/tmp/source.dump.gz");
    execute(restored, "gzip-restore.log", "gzip", "-d", "/tmp/source.dump.gz");
    execute(restored, "restore.toc", "pg_restore", "--list", "/tmp/source.dump");
    execute(
        restored,
        "restore.log",
        "pg_restore",
        "--exit-on-error",
        "--no-owner",
        "--no-acl",
        "--username=blockout_migration",
        "--dbname=blockout",
        "/tmp/source.dump");
    try (Connection connection = migrationConnection();
        java.sql.Statement statement = connection.createStatement()) {
      statement.execute(
          "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO blockout_app");
      statement.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO blockout_app");
      statement.execute(
          "ALTER DEFAULT PRIVILEGES FOR ROLE blockout_migration IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO blockout_app");
      statement.execute(
          "ALTER DEFAULT PRIVILEGES FOR ROLE blockout_migration IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO blockout_app");
    }
  }

  /**
   * Reads the native PostgreSQL 18 volume identity to prove source and destination storage differ.
   *
   * @param fixture this suite's source or restored database
   * @return nonblank native data-volume name
   */
  private String postgresVolume(PostgreSQLContainer fixture) {
    String volume =
        fixture.getCurrentContainerInfo().getMounts().stream()
            .filter(mount -> "/var/lib/postgresql".equals(mount.getDestination().getPath()))
            .map(Mount::getName)
            .findFirst()
            .orElseThrow();
    assertThat(volume).isNotBlank();
    return volume;
  }

  /**
   * Executes a native database/archive tool; local socket trust avoids secret command arguments.
   * Binary archives use Testcontainers' file-copy API, while diagnostics remain in ignored files.
   *
   * @param fixture task-owned database container
   * @param logName private output name for this operation
   * @param command native tool and explicit arguments
   * @throws Exception if execution, diagnostic capture or the native command fails
   */
  private void execute(PostgreSQLContainer fixture, String logName, String... command)
      throws Exception {
    ExecResult result = fixture.execInContainer(command);
    Path log = output.resolve(logName);
    Files.writeString(log, result.getStdout() + result.getStderr());
    assertThat(result.getExitCode()).as("Native command; inspect ignored log %s", log).isZero();
  }

  /**
   * Stops the serving process and issuer, then closes every disposable fixture, even after failure.
   * The original Compose resources are untouched; this suite's archive and process logs persist.
   */
  @Override
  public void close() throws Exception {
    try (source;
        restored;
        nativeEngine;
        http) {
      try {
        if (backend != null && backend.isAlive()) {
          crash();
        }
      } finally {
        if (keys != null) {
          keys.stop(0);
        }
      }
    }
  }
}
