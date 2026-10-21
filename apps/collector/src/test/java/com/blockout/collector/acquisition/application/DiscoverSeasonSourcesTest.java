package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.ffvb.FfvbDiscovery;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.acquisition.lnv.LnvDiscovery;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.Charset;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Native navigation over controlled HTTP responses; no external provider or backend write. */
@DisplayName("Bound-source discovery traversal")
class DiscoverSeasonSourcesTest {
  @Test
  @DisplayName("An unavailable frame preserves discovered siblings as a partial catalog")
  void retainsPartialFrameCatalog() {
    // Given
    URI root = URI.create("https://www.ffvbbeach.org/ffvbapp/resu/seniors/2026-2027/index.htm");
    URI selector = root.resolve("pbscript.htm");
    URI missing = root.resolve("unavailable.htm");
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    when(http.page(root))
        .thenReturn(
            response(
                root,
                "<frameset><frame src='pbscript.htm'><frame src='unavailable.htm'></frameset>"));
    when(http.page(selector))
        .thenReturn(
            response(
                selector,
                """
        <form><span>Elite</span><select><option value="https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2026/2027&codent=ABCCS&poule=EA">Elite A</option></select></form>
        """));
    when(http.page(missing))
        .thenReturn(CompletableFuture.failedFuture(new IOException("Synthetic unavailable frame")));
    DiscoverSeasonSources service =
        new DiscoverSeasonSources(
            http,
            http,
            new FfvbDiscovery(),
            new LnvDiscovery(),
            mock(CollectionBackend.class),
            mock(CollectorLifecycle.class),
            Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));
    CollectionBackend.Target target =
        CollectionBackend.Target.builder()
            .provider(CollectionProviderEnum.FFVB)
            .url(root)
            .seasonLabel("2026/2027")
            .organizerReference("ABCCS")
            .build();

    // When
    DiscoverSeasonSources.Read read = service.catalog(target);

    // Then
    assertThat(read.catalog().complete()).isFalse();
    assertThat(read.catalog().pools())
        .extracting(SportingObservation.Pool::poolReference)
        .containsExactly("EA");
    assertThat(read.observedAt()).isEqualTo(Instant.EPOCH);
  }

  /**
   * Encodes a complete synthetic source response without changing its final URL.
   *
   * @param url source response context
   * @param html synthetic native markup
   * @return completed bounded transport response
   */
  private CompletableFuture<ProviderHttpClient.Response> response(URI url, String html) {
    return CompletableFuture.completedFuture(
        new ProviderHttpClient.Response(html.getBytes(Charset.forName("windows-1252")), url, true));
  }
}
