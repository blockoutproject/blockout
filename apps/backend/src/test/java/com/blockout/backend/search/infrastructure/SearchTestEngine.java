package com.blockout.backend.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.github.dockerjava.api.command.InspectContainerResponse;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.transport.OpenSearchTransport;
import org.springframework.boot.ssl.DefaultSslBundleRegistry;
import org.springframework.boot.ssl.SslBundle;
import org.springframework.boot.ssl.SslStoreBundle;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.testcontainers.containers.Container;
import org.testcontainers.containers.ContainerLaunchException;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.ShellStrategy;
import org.testcontainers.utility.MountableFile;

/** Shared disposable native TLS engine for matching and PostgreSQL traversal suites. */
@lombok.NoArgsConstructor(access = lombok.AccessLevel.PRIVATE)
public final class SearchTestEngine {
  private static Path temporary;
  private static GenericContainer<?> engine;
  private static OpenSearchTransport transport;
  public static OpenSearchClient client;
  static DefaultSslBundleRegistry bundles;
  static String password;

  /**
   * Creates private native security configuration and starts only this suite's ephemeral engine.
   * Uses OpenSearch's five-minute Testcontainers startup bound for cold or busy CI hosts; readiness
   * still requires a CA-verified HTTPS 401 response.
   */
  public static void startEngine() throws Exception {
    temporary = Files.createTempDirectory("issue210-search-");
    Path infrastructure = Path.of("../../infra/opensearch").toAbsolutePath().normalize();
    Path tls = temporary.resolve("tls");
    Process certificates =
        new ProcessBuilder(
                "bash",
                infrastructure.resolve("generate-certificates.sh").toString(),
                tls.toString())
            .redirectErrorStream(true)
            .start();
    assertThat(certificates.waitFor()).isZero();
    Path security = temporary.resolve("security");
    Files.createDirectory(security);
    for (String file :
        List.of(
            "config.yml", "roles.yml", "roles_mapping.yml", "action_groups.yml", "tenants.yml")) {
      Files.copy(infrastructure.resolve("security").resolve(file), security.resolve(file));
    }
    password = UUID.randomUUID().toString();
    Files.writeString(
        security.resolve("internal_users.yml"),
        """
        _meta:
          type: internalusers
          config_version: 2
        blockout_search:
          hash: '%s'
        """
            .formatted(new BCryptPasswordEncoder().encode(password)));
    engine =
        new GenericContainer<>("opensearchproject/opensearch:3.9.0")
            .withEnv("DISABLE_INSTALL_DEMO_CONFIG", "true")
            .withEnv("OPENSEARCH_JAVA_OPTS", "-Xms512m -Xmx512m")
            .withExposedPorts(9200)
            .withCopyFileToContainer(
                MountableFile.forHostPath(infrastructure.resolve("opensearch.yml")),
                "/usr/share/opensearch/config/opensearch.yml")
            .withCopyFileToContainer(
                MountableFile.forHostPath(security, 0755),
                "/usr/share/opensearch/config/opensearch-security")
            .waitingFor(
                new ShellStrategy() {
                  /** Captures safe failure evidence before Testcontainers removes the container. */
                  @Override
                  protected void waitUntilReady() {
                    try {
                      super.waitUntilReady();
                    } catch (ContainerLaunchException failure) {
                      throw readinessFailure(failure);
                    }
                  }
                }.withCommand(
                    "curl --silent --cacert config/tls/ca.pem -o /dev/null -w '%{http_code}' https://localhost:9200 | grep -q 401"))
            .withStartupTimeout(Duration.ofMinutes(5));
    for (String file : List.of("ca.pem", "node.pem", "node-key.pem")) {
      engine.withCopyFileToContainer(
          MountableFile.forHostPath(tls.resolve(file), 0644),
          "/usr/share/opensearch/config/tls/" + file);
    }
    engine.start();
    KeyStore trust = KeyStore.getInstance(KeyStore.getDefaultType());
    trust.load(null);
    try (InputStream input = Files.newInputStream(tls.resolve("ca.pem"))) {
      trust.setCertificateEntry(
          "local-ca", CertificateFactory.getInstance("X.509").generateCertificate(input));
    }
    bundles = new DefaultSslBundleRegistry();
    bundles.registerBundle("trusted", SslBundle.of(SslStoreBundle.of(null, null, trust)));
    bundles.registerBundle("untrusted", SslBundle.of(SslStoreBundle.of(null, null, null)));
    transport =
        new OpenSearchConfiguration().openSearchTransport(properties("trusted", password), bundles);
    client = new OpenSearchClient(transport);
  }

  /**
   * Adds only container state and a bounded unauthenticated TLS probe to the original startup
   * error. Missing diagnostics remain null or unavailable; diagnostic failures never replace the
   * wait error.
   *
   * @param failure the original readiness failure
   * @return failure carrying scalars that remain visible in the test report
   */
  private static ContainerLaunchException readinessFailure(ContainerLaunchException failure) {
    Boolean running = null;
    Boolean oomKilled = null;
    Long exitCode = null;
    Integer curlExitCode = null;
    String httpStatus = "unavailable";
    try {
      InspectContainerResponse.ContainerState state = engine.getCurrentContainerInfo().getState();
      running = state.getRunning();
      oomKilled = state.getOOMKilled();
      exitCode = state.getExitCodeLong();
    } catch (RuntimeException ignored) {
      // A removed container must not mask the original readiness failure.
    }
    try {
      Container.ExecResult probe =
          engine.execInContainer(
              "curl",
              "--silent",
              "--max-time",
              "5",
              "--cacert",
              "config/tls/ca.pem",
              "-o",
              "/dev/null",
              "-w",
              "%{http_code}",
              "https://localhost:9200");
      curlExitCode = probe.getExitCode();
      if (probe.getStdout().matches("[0-9]{3}")) httpStatus = probe.getStdout();
    } catch (InterruptedException interrupted) {
      Thread.currentThread().interrupt();
    } catch (IOException | RuntimeException ignored) {
      // Do not expose command output or replace the original failure if the probe cannot run.
    }
    return new ContainerLaunchException(
        "OpenSearch readiness failed: running=%s, oomKilled=%s, exitCode=%s, curlExitCode=%s, httpStatus=%s"
            .formatted(running, oomKilled, exitCode, curlExitCode, httpStatus),
        failure);
  }

  /** Closes native HTTP threads and removes only this suite's container. */
  public static void stopEngine() throws Exception {
    try {
      if (transport != null) transport.close();
    } finally {
      if (engine != null) engine.stop();
      if (temporary != null) {
        try (java.util.stream.Stream<Path> paths = Files.walk(temporary)) {
          for (Path path : paths.sorted(java.util.Comparator.reverseOrder()).toList())
            Files.deleteIfExists(path);
        }
      }
    }
  }

  /**
   * Supplies native connection inputs for a deliberate trust/credential scenario.
   *
   * @param bundle trusted or untrusted fixture trust bundle
   * @param secret disposable scenario credential
   * @return bounded connection to this suite's engine
   */
  static OpenSearchProperties properties(String bundle, String secret) {
    return new OpenSearchProperties(
        URI.create("https://localhost:" + engine.getMappedPort(9200)),
        "blockout_search",
        secret,
        bundle,
        3000,
        5000);
  }

  /**
   * Reads the committed native mapping with the official client's own deserializer.
   *
   * @param index synthetic index name in the isolated security namespace
   */
  public static void createIndex(String index) throws Exception {
    org.opensearch.client.json.JsonpMapper mapper = client._transport().jsonpMapper();
    try (InputStream input = SearchTestEngine.class.getResourceAsStream("/search/indices.json");
        jakarta.json.stream.JsonParser parser = mapper.jsonProvider().createParser(input)) {
      Map<String, org.opensearch.client.json.JsonData> definition =
          org.opensearch.client.json.JsonpDeserializer.stringMapDeserializer(
                  org.opensearch.client.json.JsonData._DESERIALIZER)
              .deserialize(parser, mapper);
      org.opensearch.client.opensearch.indices.IndexSettings settings =
          definition
              .get("settings")
              .deserialize(
                  org.opensearch.client.opensearch.indices.IndexSettings._DESERIALIZER, mapper);
      org.opensearch.client.opensearch._types.mapping.TypeMapping mapping =
          definition
              .get("mappings")
              .deserialize(
                  org.opensearch.client.opensearch._types.mapping.TypeMapping._DESERIALIZER,
                  mapper);
      client.indices().create(request -> request.index(index).settings(settings).mappings(mapping));
    }
  }
}
