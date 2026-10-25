package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.ffvb.FfvbDiscovery;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.acquisition.lnv.LnvDiscovery;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Real native entry interpreters and ECS encoding with controlled transport and backend owners. */
@ExtendWith(OutputCaptureExtension.class)
@SpringBootTest(
    classes = CurrentEntryOperationalEvidenceIntegrationTest.LoggingConfiguration.class,
    webEnvironment = SpringBootTest.WebEnvironment.NONE,
    properties = {
      "spring.main.banner-mode=off",
      "spring.main.log-startup-info=false",
      "spring.main.keep-alive=false"
    })
@DisplayName("Current official entry evidence")
class CurrentEntryOperationalEvidenceIntegrationTest {
  private static final URI ENTRY = URI.create("https://www.lnv.fr/competitions/alterna-volstar");
  private static final URI SOURCE =
      URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=902");
  private final ProviderHttpClient http = mock(ProviderHttpClient.class);
  private final CollectionBackend backend = mock(CollectionBackend.class);
  private DiscoverSeasonSources discovery;

  @Test
  @DisplayName("A usable reread recovers only the same official entry")
  void recoversSameEntry(CapturedOutput output) {
    // Given
    when(http.page(ENTRY))
        .thenReturn(
            CompletableFuture.failedFuture(new IOException("private-provider-body")),
            response(ENTRY, "<iframe src='" + SOURCE + "'></iframe>"));
    when(http.page(SOURCE))
        .thenReturn(
            response(
                SOURCE,
                "<title>Alterna VOLSTAR 2026/2027</title><a href='" + SOURCE + "'>Regular</a>"));

    // When
    discovery.currentEntries();
    discovery.currentEntries();

    // Then
    assertThat(entry(output, "lnv-men-first"))
        .extracting(log -> log.path("collection_entry_usable").asInt(-1))
        .containsExactly(0, 1);
    assertThat(entry(output, "lnv-women-first"))
        .extracting(log -> log.path("collection_entry_usable").asInt(-1))
        .containsExactly(0, 0);
    verify(backend).observeSource(any());
    assertThat(output.getAll())
        .doesNotContain("private-provider-body", "www.lnv.fr", "lnv-web.dataproject.com");
  }

  @Test
  @DisplayName("An unrecognized entry cannot manufacture recovery")
  void refusesUnrecognizedEntry(CapturedOutput output) {
    // Given
    when(http.page(ENTRY)).thenReturn(response(ENTRY, "<html>unrecognized page</html>"));

    // When
    discovery.currentEntries();

    // Then
    assertThat(entry(output, "lnv-men-first"))
        .singleElement()
        .satisfies(
            log -> {
              assertThat(log.path("collection_entry_usable").asInt(-1)).isZero();
              assertThat(log.path("outcome").asText()).isEqualTo("failed");
            });
    verify(backend, never()).observeSource(any());
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("An accepted FFVB neighbor does not cover an unreadable branch")
  void retainsPartialEntryFailure(boolean http200, CapturedOutput output) {
    // Given
    URI entry = URI.create("https://www.ffvb.org/120-37-1-Championnats-Regionaux");
    URI broken = URI.create("https://www.ffvbbeach.org/ffvbapp/resu/broken.htm");
    URI valid = URI.create("https://www.ffvbbeach.org/ffvbapp/resu/valid.htm");
    when(http.page(broken))
        .thenReturn(
            http200
                ? response(broken, "<html>unrecognized page</html>")
                : CompletableFuture.failedFuture(new IOException("private-provider-body")));
    when(http.page(entry))
        .thenReturn(
            response(
                entry, "<a href='" + broken + "'>First</a><a href='" + valid + "'>Second</a>"));
    when(http.page(valid))
        .thenReturn(
            response(
                valid,
                "<span>Regional</span><select><option value='vbspo_calendrier.php?saison=2026/2027&codent=LIRA&poule=AA'>Pool</option></select>"));

    // When
    discovery.currentEntries();

    // Then
    verify(backend).observeSource(any());
    assertThat(entry(output, "ffvb-regional"))
        .singleElement()
        .satisfies(log -> assertThat(log.path("collection_entry_usable").asInt(-1)).isZero());
  }

  @Test
  @DisplayName("Missing seasonal attribution is not an unusable recognized source")
  void preservesUnknownSeason(CapturedOutput output) {
    // Given
    when(http.page(ENTRY)).thenReturn(response(ENTRY, "<iframe src='" + SOURCE + "'></iframe>"));
    when(http.page(SOURCE))
        .thenReturn(
            response(SOURCE, "<title>Alterna VOLSTAR</title><a href='" + SOURCE + "'>Regular</a>"));

    // When
    discovery.currentEntries();

    // Then
    assertThat(entry(output, "lnv-men-first"))
        .singleElement()
        .satisfies(log -> assertThat(log.path("collection_entry_usable").asInt(-1)).isEqualTo(1));
    verify(backend, never()).observeSource(any());
  }

  /** Starts each scenario with unavailable entries, real parsers and an active native lifecycle. */
  @BeforeEach
  void startsWithUnavailableEntries() {
    when(http.page(any()))
        .thenReturn(CompletableFuture.failedFuture(new IOException("private-provider-body")));
    CollectorLifecycle lifecycle = new CollectorLifecycle(backend);
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    discovery =
        new DiscoverSeasonSources(
            http,
            http,
            new FfvbDiscovery(),
            new LnvDiscovery(),
            backend,
            lifecycle,
            Clock.fixed(Instant.parse("2026-10-25T00:00:00Z"), ZoneOffset.UTC));
  }

  /**
   * Supplies bounded synthetic native markup without a live provider or a copied transport model.
   *
   * @param url response URL required for native context qualification
   * @param html synthetic interpretable provider markup
   * @return completed controlled response
   */
  private CompletableFuture<ProviderHttpClient.Response> response(URI url, String html) {
    return CompletableFuture.completedFuture(
        new ProviderHttpClient.Response(html.getBytes(StandardCharsets.UTF_8), url, true));
  }

  /**
   * Selects one stable official entry from the actual native ECS stream.
   *
   * @param output this scenario's captured console output
   * @param scope fixed public entry identity, never a raw URL
   * @return scoped observations in their emitted order
   */
  private List<JsonNode> entry(CapturedOutput output, String scope) {
    JsonMapper json = JsonMapper.builder().build();
    return output
        .getOut()
        .lines()
        .filter(line -> line.startsWith("{"))
        .map(json::readTree)
        .filter(
            log ->
                log.path("operation").asText().equals("source_discovery")
                    && log.path("scope").asText().equals(scope))
        .toList();
  }

  /** Starts only Boot's native console encoder; the discovery owner is constructed by each test. */
  @Configuration(proxyBeanMethods = false)
  static class LoggingConfiguration {}
}
