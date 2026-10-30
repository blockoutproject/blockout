package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.lnv.LnvDiscovery;
import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.SourceValidationStateEnum;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Candidate interpretation uses controlled complete HTTP responses; no backend mutation is implied.
 */
@DisplayName("Exact admitted source qualification")
class QualifySourceTest {
  @Test
  @DisplayName("Qualification consumes the admitted candidate without another backend read")
  void qualifiesAdmittedSnapshot() {
    // Given: real admission and qualification, controlled provider and backend boundaries.
    CollectionBackend backend = mock(CollectionBackend.class);
    CollectorLifecycle lifecycle = new CollectorLifecycle(backend);
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    UUID source = UUID.fromString("00000000-0000-4000-8000-000000000151");
    URI url = URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901");
    CollectionBackend.Candidate candidate =
        new CollectionBackend.Candidate(url, "2026/2027", CollectionProviderEnum.LNV, "901");
    when(backend.admit(any()))
        .thenAnswer(
            call -> {
              CollectionBackend.StartCycle command = call.getArgument(0);
              return new CollectionBackend.Cycle(
                  command.cycleId(),
                  command.incarnationId(),
                  null,
                  source,
                  1,
                  null,
                  CollectionCycleStateEnum.RUNNING,
                  candidate,
                  null);
            });
    CollectorLifecycle.AdmittedCycle context = lifecycle.admit(null, source, 7, null);
    ProviderPages http = mock(ProviderPages.class);
    byte[] page =
        "<title>Alterna VOLSTAR 2026/2027</title><a href='CompetitionMatches.aspx?ID=901&PID=902'>Regular</a>"
            .getBytes(StandardCharsets.UTF_8);
    when(http.page(url))
        .thenReturn(CompletableFuture.completedFuture(new ProviderResponse(page, url, true)));
    QualifySource service =
        new QualifySource(
            http,
            new LnvDiscovery(),
            mock(DiscoverSeasonSources.class),
            lifecycle,
            Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

    // When
    service.execute(context);

    // Then
    verify(http).page(url);
    verify(backend)
        .validate(
            source,
            new CollectionBackend.Validation(
                context.getCycle().id(),
                SourceValidationStateEnum.QUALIFIED,
                Instant.EPOCH,
                "2026/2027",
                null,
                null));

    verify(backend, never()).complete(any(), any());
  }

  @Test
  @DisplayName(
      "A supported LNV championship without season evidence requires explicit confirmation")
  void requiresSeasonEvidence() {
    // Given
    ProviderPages http = mock(ProviderPages.class);
    URI url = URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901");
    byte[] page =
        "<title>Alterna VOLSTAR</title><a href='CompetitionMatches.aspx?ID=901&PID=902'>Regular</a>"
            .getBytes(StandardCharsets.UTF_8);
    when(http.page(url))
        .thenReturn(CompletableFuture.completedFuture(new ProviderResponse(page, url, true)));
    QualifySource service =
        new QualifySource(
            http,
            new LnvDiscovery(),
            mock(DiscoverSeasonSources.class),
            mock(CollectorLifecycle.class),
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
    ProviderPages http = mock(ProviderPages.class);
    URI url = URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901");
    byte[] page =
        "<title>Alterna VOLSTAR</title><a href='CompetitionMatches.aspx?ID=999&PID=902'>Regular</a>"
            .getBytes(StandardCharsets.UTF_8);
    when(http.page(url))
        .thenReturn(
            CompletableFuture.completedFuture(
                new ProviderResponse(
                    page,
                    URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=999"),
                    true)));
    QualifySource service =
        new QualifySource(
            http,
            new LnvDiscovery(),
            mock(DiscoverSeasonSources.class),
            mock(CollectorLifecycle.class),
            Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

    // When
    QualifySource.Evidence result =
        service.qualify(
            new CollectionBackend.Candidate(url, "2026/2027", CollectionProviderEnum.LNV, "901"));

    // Then
    assertThat(result.state()).isEqualTo(SourceValidationStateEnum.INVALID);
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName("Qualification preserves technical unavailability separately from content refusal")
  void preservesFailureCategory(boolean unavailable) {
    // Given
    ProviderPages http = mock(ProviderPages.class);
    URI url = URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901");
    if (unavailable)
      when(http.page(url))
          .thenReturn(
              CompletableFuture.failedFuture(new IOException("Synthetic transport failure")));
    else
      when(http.page(url))
          .thenReturn(
              CompletableFuture.completedFuture(
                  new ProviderResponse(
                      "<html>Unsupported synthetic content</html>".getBytes(StandardCharsets.UTF_8),
                      url,
                      true)));
    QualifySource service =
        new QualifySource(
            http,
            new LnvDiscovery(),
            mock(DiscoverSeasonSources.class),
            mock(CollectorLifecycle.class),
            Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

    // When
    QualifySource.Evidence evidence =
        service.qualify(
            new CollectionBackend.Candidate(url, "2023/2024", CollectionProviderEnum.LNV, "901"));

    // Then
    assertThat(evidence.state()).isEqualTo(SourceValidationStateEnum.INVALID);
    assertThat(evidence.reasonType())
        .isEqualTo(
            URI.create(
                unavailable
                    ? "urn:blockout:acquisition:technical"
                    : "urn:blockout:acquisition:structure"));
  }
}
