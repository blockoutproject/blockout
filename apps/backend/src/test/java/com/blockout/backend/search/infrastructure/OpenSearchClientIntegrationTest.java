package com.blockout.backend.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.net.ssl.SSLHandshakeException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch._types.OpenSearchException;
import org.opensearch.client.opensearch.core.BulkResponse;
import org.opensearch.client.opensearch.core.SearchResponse;
import org.opensearch.client.transport.OpenSearchTransport;
import org.springframework.boot.ssl.DefaultSslBundleRegistry;
import org.springframework.boot.ssl.SslBundle;
import org.springframework.boot.ssl.SslStoreBundle;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.MountableFile;

/**
 * Real pinned engine and native production transport; all documents, TLS and credentials are
 * disposable.
 */
@DisplayName("Native OpenSearch client qualification")
class OpenSearchClientIntegrationTest {
  @TempDir static Path temporary;
  private static GenericContainer<?> engine;
  private static OpenSearchTransport transport;
  private static OpenSearchClient client;
  private static DefaultSslBundleRegistry bundles;
  private static String password;

  /**
   * Creates private native security configuration and starts only this suite's ephemeral engine.
   */
  @BeforeAll
  static void startEngine() throws Exception {
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
                Wait.forSuccessfulCommand(
                    "curl --silent --cacert config/tls/ca.pem -o /dev/null -w '%{http_code}' https://localhost:9200 | grep -q 401"));
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

  /** Closes native HTTP threads and removes only this suite's container. */
  @AfterAll
  static void stopEngine() throws Exception {
    if (transport != null) transport.close();
    if (engine != null) engine.stop();
  }

  @Test
  @DisplayName("Connects through trusted TLS to the selected engine")
  void connectsWithTrustedTls() throws Exception {
    // Given
    OpenSearchClient trusted = client;

    // When
    String version = trusted.info().version().number();

    // Then
    assertThat(version).isEqualTo("3.9.0");
  }

  @Test
  @DisplayName("Refuses an untrusted TLS certificate")
  void refusesUntrustedTls() throws Exception {
    // Given
    try (OpenSearchTransport untrusted =
        new OpenSearchConfiguration()
            .openSearchTransport(properties("untrusted", password), bundles)) {
      OpenSearchClient untrustedClient = new OpenSearchClient(untrusted);

      // When
      Throwable failure = catchThrowable(untrustedClient::info);

      // Then
      assertThat(failure).hasCauseInstanceOf(SSLHandshakeException.class);
    }
  }

  @Test
  @DisplayName("Refuses wrong credentials without anonymous fallback")
  void refusesWrongCredentials() throws Exception {
    // Given
    try (OpenSearchTransport denied =
        new OpenSearchConfiguration()
            .openSearchTransport(properties("trusted", "incorrect-synthetic-password"), bundles)) {
      OpenSearchClient deniedClient = new OpenSearchClient(denied);

      // When
      Throwable failure = catchThrowable(deniedClient::info);

      // Then
      assertThat(failure).isInstanceOf(IOException.class).hasMessage("Unauthorized access");
    }
  }

  @Test
  @DisplayName("Refuses writes outside the local search namespace")
  void refusesUnrelatedIndex() {
    // Given
    String unrelated = "unrelated-" + UUID.randomUUID();

    // When
    Throwable failure =
        catchThrowable(() -> client.indices().create(request -> request.index(unrelated)));

    // Then
    assertThat(failure).isInstanceOf(IOException.class).hasMessage("Forbidden access");
  }

  @Test
  @DisplayName("Preserves native document serialization through a query after explicit refresh")
  void serializesQueriesAfterRefresh() throws Exception {
    // Given
    String index = newIndex();
    SyntheticDocument document = new SyntheticDocument("Étoile Volley", 7);
    client.index(request -> request.index(index).id("one").document(document));
    assertThat(
            client.search(request -> request.index(index), SyntheticDocument.class).hits().hits())
        .isEmpty();

    // When
    client.indices().refresh(request -> request.index(index));
    SearchResponse<SyntheticDocument> result =
        client.search(
            request ->
                request
                    .index(index)
                    .query(
                        query ->
                            query.match(
                                match ->
                                    match
                                        .field("name")
                                        .query(value -> value.stringValue("Volley")))),
            SyntheticDocument.class);

    // Then
    assertThat(result.timedOut()).isFalse();
    assertThat(result.shards().failed()).isZero();
    assertThat(result.hits().hits())
        .singleElement()
        .satisfies(hit -> assertThat(hit.source()).isEqualTo(document));
  }

  @Test
  @DisplayName("Reports failed bulk items inside a successful HTTP response")
  void reportsIndividualBulkOutcomes() throws Exception {
    // Given
    String index = newIndex();

    // When
    BulkResponse result =
        client.bulk(
            request ->
                request
                    .operations(
                        operation ->
                            operation.index(
                                item ->
                                    item.index(index)
                                        .id("valid")
                                        .document(new SyntheticDocument("Club", 1))))
                    .operations(
                        operation ->
                            operation.index(
                                item ->
                                    item.index(index)
                                        .id("invalid")
                                        .document(
                                            Map.of("name", "Club", "count", "not-an-integer")))));

    // Then
    assertThat(result.errors()).isTrue();
    assertThat(result.items()).hasSize(2);
    assertThat(result.items().getFirst().error()).isNull();
    assertThat(result.items().getLast().status()).isEqualTo(400);
    assertThat(result.items().getLast().error()).isNotNull();
  }

  @Test
  @DisplayName("Replaces all resource aliases atomically without partial failure")
  void switchesAliasesAtomically() throws Exception {
    // Given
    List<String> aliases =
        List.of("clubs", "teams", "pools").stream()
            .map(type -> "blockout-local-search-" + type + "-" + UUID.randomUUID())
            .toList();
    List<String> before = List.of(newIndex(), newIndex(), newIndex());
    List<String> after = List.of(newIndex(), newIndex(), newIndex());
    client
        .indices()
        .updateAliases(
            request -> {
              for (int i = 0; i < aliases.size(); i++) {
                int position = i;
                request.actions(
                    action ->
                        action.add(
                            add -> add.alias(aliases.get(position)).index(before.get(position))));
              }
              return request;
            });

    // When
    Throwable failure =
        catchThrowable(
            () ->
                client
                    .indices()
                    .updateAliases(
                        request ->
                            request
                                .actions(
                                    action ->
                                        action.remove(
                                            remove ->
                                                remove
                                                    .alias(aliases.getFirst())
                                                    .index(before.getFirst())))
                                .actions(
                                    action ->
                                        action.add(
                                            add ->
                                                add.alias(aliases.getFirst())
                                                    .index("blockout-local-search-missing")))));

    // Then: a rejected action cannot publish a partial replacement.
    assertThat(failure).isInstanceOf(OpenSearchException.class);
    assertThat(
            client
                .indices()
                .getAlias(request -> request.index("blockout-local-search-*").name(aliases))
                .result()
                .keySet())
        .containsExactlyInAnyOrderElementsOf(before);

    // When
    client
        .indices()
        .updateAliases(
            request -> {
              for (int i = 0; i < aliases.size(); i++) {
                int position = i;
                request.actions(
                    action ->
                        action.remove(
                            remove ->
                                remove.alias(aliases.get(position)).index(before.get(position))));
                request.actions(
                    action ->
                        action.add(
                            add -> add.alias(aliases.get(position)).index(after.get(position))));
              }
              return request;
            });

    // Then
    assertThat(
            client
                .indices()
                .getAlias(request -> request.index("blockout-local-search-*").name(aliases))
                .result()
                .keySet())
        .containsExactlyInAnyOrderElementsOf(after);
  }

  /**
   * Creates an isolated mapped index with automatic refresh disabled for deterministic visibility.
   */
  private static String newIndex() throws Exception {
    String index = "blockout-local-search-" + UUID.randomUUID();
    client
        .indices()
        .create(
            request ->
                request
                    .index(index)
                    .settings(
                        settings ->
                            settings
                                .numberOfShards(1)
                                .numberOfReplicas(0)
                                .refreshInterval(interval -> interval.time("-1")))
                    .mappings(
                        mapping ->
                            mapping
                                .properties("name", property -> property.text(text -> text))
                                .properties(
                                    "count", property -> property.integer(integer -> integer))));
    return index;
  }

  /**
   * Selects a native bundle and credential for the current disposable endpoint.
   *
   * @param bundle trusted or system-default trust bundle
   * @param secret scenario credential
   * @return production connection inputs
   */
  private static OpenSearchProperties properties(String bundle, String secret) {
    return new OpenSearchProperties(
        URI.create("https://localhost:" + engine.getMappedPort(9200)),
        "blockout_search",
        secret,
        bundle,
        3000,
        5000);
  }

  /**
   * Synthetic immutable payload exercises the client's own JSON mapper, independent of MVC Jackson.
   */
  public record SyntheticDocument(String name, int count) {}
}
