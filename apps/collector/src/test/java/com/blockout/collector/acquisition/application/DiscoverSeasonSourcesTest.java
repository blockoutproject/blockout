package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.ffvb.FfvbDiscovery;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.acquisition.lnv.LnvDiscovery;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.Charset;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

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

  @Test
  @DisplayName("An isolated round cannot establish the whole seasonal catalog")
  void refusesRoundAsSeasonRoot() throws Exception {
    // Given
    URI round =
        URI.create(
            "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2026/2027&codent=LIIDF&division=YOUTH&tour=01");
    String html;
    try (InputStream input = getClass().getResourceAsStream("/acquisition/ffvb/round.html")) {
      html = new String(input.readAllBytes(), Charset.forName("windows-1252"));
    }
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    when(http.page(round)).thenReturn(response(round, html));
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
            .url(round)
            .seasonLabel("2026/2027")
            .organizerReference("LIIDF")
            .build();

    // When / Then
    assertThatThrownBy(() -> service.catalog(target)).isInstanceOf(FfvbAcquisitionException.class);
  }

  @Test
  @DisplayName("A contradictory LNV season never reaches a shared-page consumer")
  void validatesBeforeConsumption() {
    // Given
    URI url = URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=902");
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    when(http.page(url))
        .thenReturn(
            response(
                url,
                "<title>Alterna VOLSTAR 2027/2028</title><a href='CompetitionMatches.aspx?ID=901&PID=902'>Regular</a>"));
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
            .provider(CollectionProviderEnum.LNV)
            .url(url)
            .seasonLabel("2026/2027")
            .organizerReference("901")
            .build();
    List<DiscoverSeasonSources.PageRead> consumed = new ArrayList<>();

    // When / Then
    assertThatThrownBy(() -> service.catalog(target, () -> 1, consumed::add))
        .isInstanceOf(IllegalArgumentException.class);
    assertThat(consumed).isEmpty();
  }

  @Test
  @DisplayName("A championship standings link without PID remains exactly as published")
  void retainsChampionshipStandings() {
    // Given
    URI url = URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=902");
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    when(http.page(url))
        .thenReturn(
            response(
                url,
                "<title>Alterna VOLSTAR 2026/2027</title><a href='CompetitionMatches.aspx?ID=901&PID=902'>Regular</a><a href='CompetitionStandings.aspx?ID=901'>Table</a><div class=rmpView id=Content_Main_903><span id=g_lbl_title>Group</span></div>"));
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
            .provider(CollectionProviderEnum.LNV)
            .url(url)
            .seasonLabel("2026/2027")
            .organizerReference("901")
            .build();

    // When
    DiscoverSeasonSources.Read read = service.catalog(target);

    // Then
    assertThat(read.catalog().pools().getFirst().standingsUrl())
        .isEqualTo(url.resolve("CompetitionStandings.aspx?ID=901"));
  }

  @Test
  @DisplayName("An unavailable current FFVB menu does not prevent an independent neighbor proposal")
  void continuesNeighborAfterFailure() {
    // Given
    URI entry = URI.create("https://www.ffvb.org/120-37-1-Championnats-Regionaux");
    URI broken = URI.create("https://www.ffvbbeach.org/ffvbapp/resu/broken.htm");
    URI valid = URI.create("https://www.ffvbbeach.org/ffvbapp/resu/valid.htm");
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    when(http.page(any()))
        .thenReturn(CompletableFuture.failedFuture(new IOException("Unavailable fixture")));
    when(http.page(entry))
        .thenReturn(
            response(
                entry, "<a href='" + broken + "'>First</a><a href='" + valid + "'>Second</a>"));
    when(http.page(valid))
        .thenReturn(
            response(
                valid,
                "<span>Regional</span><select><option value='vbspo_calendrier.php?saison=2026/2027&codent=LIRA&poule=AA'>Pool</option></select>"));
    CollectionBackend backend = mock(CollectionBackend.class);
    DiscoverSeasonSources service =
        new DiscoverSeasonSources(
            http,
            http,
            new FfvbDiscovery(),
            new LnvDiscovery(),
            backend,
            mock(CollectorLifecycle.class),
            Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

    // When
    service.currentEntries();

    // Then
    ArgumentCaptor<CollectionBackend.SourceProposal> proposal =
        ArgumentCaptor.forClass(CollectionBackend.SourceProposal.class);
    verify(backend).observeSource(proposal.capture());
    assertThat(proposal.getValue().organizerReference()).isEqualTo("LIRA");
    assertThat(proposal.getValue().startYear()).isEqualTo(2026);
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
