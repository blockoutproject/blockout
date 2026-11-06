package com.blockout.backend.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.sun.net.httpserver.HttpServer;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.sql.Connection;
import java.sql.DriverManager;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import liquibase.Contexts;
import liquibase.LabelExpression;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.transport.OpenSearchTransport;
import org.springframework.boot.ssl.DefaultSslBundleRegistry;
import org.springframework.boot.ssl.SslBundle;
import org.springframework.boot.ssl.SslStoreBundle;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Owns only the opt-in F04 serving process, local identity keys and private native restore files.
 */
final class SearchRestorationRuntime implements AutoCloseable {
  private final Path jar = Path.of(required("backend-jar")).toAbsolutePath();
  private final Path compose = Path.of(required("compose-file")).toAbsolutePath();
  private final String project = required("compose-project");
  private final String databaseUrl = required("database-url");
  private final String databaseUser = required("database-user");
  private final String databasePassword = required("database-password");
  private final String migrationUser = required("migration-user");
  private final String migrationPassword = required("migration-password");
  private final int port = Integer.parseInt(required("backend-port"));
  private final Path output = Path.of("target", "search-restoration-" + UUID.randomUUID());
  private final HttpClient http = HttpClient.newHttpClient();
  private final JsonMapper json = JsonMapper.builder().build();
  private final RSAKey signingKey;
  private final HttpServer keys;
  private final OpenSearchTransport transport;
  private Process backend;
  private int incarnation;
  final OpenSearchClient engine;
  final String prefix = "blockout-local-search-351-" + UUID.randomUUID();
  final JdbcTemplate sql;

  /**
   * Connects to the explicitly owned loopback services without starting infrastructure.
   *
   * @throws Exception when required inputs, local keys or verified TLS cannot be established
   */
  SearchRestorationRuntime() throws Exception {
    assertThat(project).isEqualTo("blockout-351-search");
    assertThat(databaseUrl).isEqualTo("jdbc:postgresql://127.0.0.1:5551/blockout");
    assertThat(port).isEqualTo(8151);
    assertThat(jar).isRegularFile();
    assertThat(compose).isRegularFile();
    Files.createDirectories(output);
    sql =
        new JdbcTemplate(new DriverManagerDataSource(databaseUrl, databaseUser, databasePassword));
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
    KeyStore trust = KeyStore.getInstance(KeyStore.getDefaultType());
    trust.load(null);
    try (InputStream input =
        Files.newInputStream(
            Path.of(environment("SPRING_SSL_BUNDLE_PEM_OPENSEARCH_TRUSTSTORE_CERTIFICATE")))) {
      trust.setCertificateEntry(
          "local-ca", CertificateFactory.getInstance("X.509").generateCertificate(input));
    }
    DefaultSslBundleRegistry bundles = new DefaultSslBundleRegistry();
    bundles.registerBundle("trusted", SslBundle.of(SslStoreBundle.of(null, null, trust)));
    URI endpoint = URI.create(environment("BLOCKOUT_SEARCH_ENDPOINT"));
    assertThat(endpoint.getHost()).isIn("localhost", "127.0.0.1");
    assertThat(endpoint.getPort()).isEqualTo(9251);
    transport =
        new OpenSearchConfiguration()
            .openSearchTransport(
                new OpenSearchProperties(
                    endpoint,
                    environment("BLOCKOUT_SEARCH_USERNAME"),
                    environment("BLOCKOUT_SEARCH_PASSWORD"),
                    "trusted",
                    3000,
                    5000),
                bundles);
    engine = new OpenSearchClient(transport);
    keys.start();
  }

  /**
   * Applies the committed migration chain under its normal owner to the disposable source.
   *
   * @throws Exception if schema migration or the explicit connection fails
   */
  void migrate() throws Exception {
    try (Connection connection = migrationConnection();
        Liquibase liquibase =
            new Liquibase(
                "db/changelog/db.changelog-master.xml",
                new ClassLoaderResourceAccessor(),
                new JdbcConnection(connection))) {
      liquibase.update(new Contexts(), new LabelExpression());
    }
    assertThat(sql.queryForObject("SELECT count(*) FROM sporting_club", Integer.class)).isZero();
  }

  /**
   * Opens a short migration-owner connection on whichever isolated volume currently owns port 5551.
   *
   * @return caller-owned connection; the test owns any transaction and lock
   * @throws Exception when that explicit database is inaccessible
   */
  Connection migrationConnection() throws Exception {
    return DriverManager.getConnection(databaseUrl, migrationUser, migrationPassword);
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
    environment.put("SPRING_DATASOURCE_URL", databaseUrl);
    environment.put("SPRING_DATASOURCE_USERNAME", databaseUser);
    environment.put("SPRING_DATASOURCE_PASSWORD", databasePassword);
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
    for (String key :
        List.of(
            "BLOCKOUT_SEARCH_ENDPOINT",
            "BLOCKOUT_SEARCH_USERNAME",
            "BLOCKOUT_SEARCH_PASSWORD",
            "SPRING_SSL_BUNDLE_PEM_OPENSEARCH_TRUSTSTORE_CERTIFICATE")) {
      environment.put(key, environment(key));
    }
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
   * Makes a real PostgreSQL 18 custom dump; the source password never enters process arguments.
   *
   * @return private ignored archive, preserved after the check
   * @throws Exception if native pg_dump fails
   */
  Path dump() throws Exception {
    Path dump = output.resolve("source.dump");
    Path archive = output.resolve("source.dump.gz");
    nativePostgres(
        "postgres",
        dump,
        null,
        "pg_dump",
        "--format=custom",
        "--no-owner",
        "--no-acl",
        "--username=" + migrationUser,
        "--dbname=blockout");
    run(
        new ProcessBuilder("gzip", "-c", dump.toString())
            .redirectOutput(archive.toFile())
            .redirectError(output.resolve("gzip.log").toFile()));
    assertThat(Files.size(archive)).isPositive();
    return archive;
  }

  /**
   * Restores into the separately retained empty volume while the source and backend are stopped.
   *
   * @param archive the successfully created native source archive
   * @throws Exception if isolation, restore or ACL reapplication fails
   */
  void restore(Path archive) throws Exception {
    assertThat(backend == null || !backend.isAlive()).isTrue();
    run(
        new ProcessBuilder("gzip", "-t", archive.toString())
            .redirectError(output.resolve("gzip.log").toFile()));
    Path dump = output.resolve("restored-input.dump");
    run(
        new ProcessBuilder("gzip", "-dc", archive.toString())
            .redirectOutput(dump.toFile())
            .redirectError(output.resolve("gzip.log").toFile()));
    String source = composeOutput("ps", "-a", "-q", "postgres").strip();
    composeRun("stop", "postgres");
    assertThat(
            commandOutput(List.of("docker", "inspect", "--format", "{{.State.Running}}", source))
                .strip())
        .isEqualTo("false");
    composeRun("up", "-d", "--wait", "postgres-restore");
    String destination = composeOutput("ps", "-a", "-q", "postgres-restore").strip();
    String mount =
        "{{range .Mounts}}{{if eq .Destination \"/var/lib/postgresql\"}}{{.Name}}{{end}}{{end}}";
    String sourceVolume =
        commandOutput(List.of("docker", "inspect", "--format", mount, source)).strip();
    String destinationVolume =
        commandOutput(List.of("docker", "inspect", "--format", mount, destination)).strip();
    assertThat(sourceVolume).isNotBlank().isNotEqualTo(destinationVolume);
    assertThat(destinationVolume).isNotBlank();
    assertThat(
            sql.queryForObject(
                "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'", Integer.class))
        .isZero();
    nativePostgres("postgres-restore", output.resolve("restore.toc"), dump, "pg_restore", "--list");
    nativePostgres(
        "postgres-restore",
        null,
        dump,
        "pg_restore",
        "--exit-on-error",
        "--no-owner",
        "--no-acl",
        "--username=" + migrationUser,
        "--dbname=blockout");
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
   * Runs only the repository's PostgreSQL native tools inside the explicitly owned service.
   *
   * @param service source or restored PostgreSQL service
   * @param stdout optional binary archive destination
   * @param stdin optional binary archive source
   * @param arguments native PostgreSQL command and options
   * @throws Exception if the process fails or exceeds its local bound
   */
  private void nativePostgres(String service, Path stdout, Path stdin, String... arguments)
      throws Exception {
    List<String> command =
        composeCommand(
            "exec",
            "-T",
            service,
            "sh",
            "-c",
            "export PGPASSWORD=\"$BLOCKOUT_MIGRATION_PASSWORD\"; exec \"$@\"",
            "pg-tool");
    command.addAll(List.of(arguments));
    ProcessBuilder builder =
        new ProcessBuilder(command).redirectError(output.resolve("postgres.log").toFile());
    if (stdout != null) {
      builder.redirectOutput(stdout.toFile());
    } else {
      builder.redirectOutput(
          ProcessBuilder.Redirect.appendTo(output.resolve("postgres.log").toFile()));
    }
    if (stdin != null) {
      builder.redirectInput(stdin.toFile());
    }
    run(builder);
  }

  /**
   * Runs an owned Compose lifecycle action with private ignored output.
   *
   * @param arguments explicit native Compose subcommand and service
   * @throws Exception if the operation fails
   */
  private void composeRun(String... arguments) throws Exception {
    run(
        new ProcessBuilder(composeCommand(arguments))
            .redirectErrorStream(true)
            .redirectOutput(output.resolve("compose.log").toFile()));
  }

  /**
   * Reads native Compose metadata without parsing a second configuration model.
   *
   * @param arguments explicit native metadata query
   * @return stdout on successful completion
   * @throws Exception if the query fails
   */
  private String composeOutput(String... arguments) throws Exception {
    return commandOutput(composeCommand(arguments));
  }

  /**
   * Selects only this task's explicit project and ignored Compose file.
   *
   * @param arguments native Compose subcommand
   * @return mutable process argument list
   */
  private List<String> composeCommand(String... arguments) {
    List<String> command =
        new ArrayList<>(List.of("docker", "compose", "-p", project, "-f", compose.toString()));
    command.addAll(List.of(arguments));
    return command;
  }

  /**
   * Reads bounded native metadata output after a successful process exit.
   *
   * @param command exact native command
   * @return stdout; diagnostics remain private
   * @throws Exception if execution fails
   */
  private String commandOutput(List<String> command) throws Exception {
    Path captured = output.resolve("metadata.txt");
    run(
        new ProcessBuilder(command)
            .redirectOutput(captured.toFile())
            .redirectError(output.resolve("metadata.log").toFile()));
    return Files.readString(captured);
  }

  /**
   * Bounds owned native commands and terminates a timed-out child without leaking diagnostics.
   *
   * @param builder process with explicit redirections and no secret command arguments
   * @throws Exception if the process fails or times out
   */
  private void run(ProcessBuilder builder) throws Exception {
    Process process = builder.start();
    if (!process.waitFor(60, TimeUnit.SECONDS)) {
      process.destroyForcibly();
      throw new IllegalStateException(
          "Native qualification command timed out; inspect ignored logs");
    }
    assertThat(process.exitValue()).as("Native command; inspect ignored logs").isZero();
  }

  /**
   * Requires one explicit opt-in suite property, with no inherited database default.
   *
   * @param key property suffix in the qualification namespace
   * @return nonblank input
   */
  private static String required(String key) {
    String value = System.getProperty("qualification." + key);
    assertThat(value).as("Required qualification.%s", key).isNotBlank();
    return value;
  }

  /**
   * Requires one worktree-owned search input without echoing its value.
   *
   * @param key exact exported environment name
   * @return nonblank input
   */
  private static String environment(String key) {
    String value = System.getenv(key);
    assertThat(value).as("Required environment input %s", key).isNotBlank();
    return value;
  }

  /**
   * Stops only this suite's process and local keys; infrastructure and private evidence persist.
   */
  @Override
  public void close() throws Exception {
    try {
      if (backend != null && backend.isAlive()) {
        backend.destroy();
        if (!backend.waitFor(10, TimeUnit.SECONDS)) {
          backend.destroyForcibly();
          assertThat(backend.waitFor(10, TimeUnit.SECONDS)).isTrue();
        }
      }
    } finally {
      keys.stop(0);
      http.close();
      transport.close();
    }
  }
}
