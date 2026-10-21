package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.acquisition.lnv.LnvDiscovery;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.SourceValidationStateEnum;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

/**
 * Candidate interpretation uses controlled complete HTTP responses; no backend mutation is implied.
 */
@DisplayName("Exact admitted source qualification")
class QualifySourceTest {
  @Test
  @DisplayName(
      "A supported LNV championship without season evidence requires explicit confirmation")
  void requiresSeasonEvidence() {
    // Given
    ProviderHttpClient http = Mockito.mock(ProviderHttpClient.class);
    URI url = URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901");
    byte[] page =
        "<title>Alterna VOLSTAR</title><a href='CompetitionMatches.aspx?ID=901&PID=902'>Regular</a>"
            .getBytes(StandardCharsets.UTF_8);
    when(http.page(url))
        .thenReturn(
            CompletableFuture.completedFuture(new ProviderHttpClient.Response(page, url, true)));
    QualifySource service =
        new QualifySource(
            http,
            new LnvDiscovery(),
            Mockito.mock(DiscoverSeasonSources.class),
            Mockito.mock(CollectionBackend.class),
            Mockito.mock(CollectorLifecycle.class),
            Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

    // When
    QualifySource.Evidence result =
        service.qualify(
            new CollectionBackend.Candidate(url, "2026/2027", CollectionProviderEnum.LNV, "901"));

    // Then
    assertThat(result.state()).isEqualTo(SourceValidationStateEnum.CONFIRMATION_REQUIRED);
    assertThat(result.seasonEvidence()).isNull();
  }

  @Test
  @DisplayName("A supported-origin redirect into another championship cannot be confirmed away")
  void refusesWrongChampionship() {
    // Given
    ProviderHttpClient http = Mockito.mock(ProviderHttpClient.class);
    URI url = URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901");
    byte[] page =
        "<title>Alterna VOLSTAR</title><a href='CompetitionMatches.aspx?ID=999&PID=902'>Regular</a>"
            .getBytes(StandardCharsets.UTF_8);
    when(http.page(url))
        .thenReturn(
            CompletableFuture.completedFuture(
                new ProviderHttpClient.Response(
                    page,
                    URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=999"),
                    true)));
    QualifySource service =
        new QualifySource(
            http,
            new LnvDiscovery(),
            Mockito.mock(DiscoverSeasonSources.class),
            Mockito.mock(CollectionBackend.class),
            Mockito.mock(CollectorLifecycle.class),
            Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

    // When
    QualifySource.Evidence result =
        service.qualify(
            new CollectionBackend.Candidate(url, "2026/2027", CollectionProviderEnum.LNV, "901"));

    // Then
    assertThat(result.state()).isEqualTo(SourceValidationStateEnum.INVALID);
  }
}
