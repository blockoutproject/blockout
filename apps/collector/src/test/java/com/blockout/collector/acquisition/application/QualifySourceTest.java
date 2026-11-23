package com.blockout.collector.acquisition.application;

import static com.blockout.collector.acquisition.application.CollectionCycleFixture.runningCandidate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.ffvb.FfvbDiscovery;
import com.blockout.collector.acquisition.lnv.LnvDiscovery;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.SourceValidationStateEnum;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Candidate interpretation uses controlled complete HTTP responses; no backend mutation is implied.
 */
@DisplayName("Exact admitted source qualification")
class QualifySourceTest {
  @ParameterizedTest(name = "FFVB candidate for {0} is {1}")
  @CsvSource({"2026/2027, QUALIFIED, 2026/2027", "2025/2026, INVALID,"})
  @DisplayName("FFVB qualification follows its complete published seasonal selector")
  void qualifiesFfvbSelector(
      String season, SourceValidationStateEnum expectedState, String expectedEvidence) {
    // Given
    URI root = URI.create("https://www.ffvbbeach.org/ffvbapp/resu/pbscript.htm");
    URI calendar = root.resolve("vbspo_calendrier.php?saison=2026/2027&codent=ABCCS&poule=EA");
    ProviderPages ffvbHttp = mock(ProviderPages.class);
    ProviderPages lnvHttp = mock(ProviderPages.class);
    when(ffvbHttp.page(root))
        .thenReturn(
            new ProviderResponse(
                """
                <form><span>Elite</span><select><option value="vbspo_calendrier.php?saison=2026/2027&codent=ABCCS&poule=EA">Elite A</option></select></form>
                """
                    .getBytes(StandardCharsets.UTF_8),
                root,
                true));
    when(ffvbHttp.page(calendar)).thenReturn(new ProviderResponse(new byte[0], calendar, true));
    Clock clock = Clock.fixed(Instant.EPOCH, ZoneOffset.UTC);
    CollectionBackend backend = mock(CollectionBackend.class);
    CollectorLifecycle lifecycle = mock(CollectorLifecycle.class);
    LnvDiscovery lnv = new LnvDiscovery();
    DiscoverSeasonSources discovery =
        new DiscoverSeasonSources(
            ffvbHttp, lnvHttp, new FfvbDiscovery(), lnv, backend, lifecycle, clock);
    QualifySource qualification = new QualifySource(lnvHttp, lnv, discovery, lifecycle, clock);

    // When
    QualifySource.Evidence result =
        qualification.qualify(
            new CollectionBackend.Candidate(root, season, CollectionProviderEnum.FFVB, "ABCCS"));

    // Then
    assertThat(result.state()).isEqualTo(expectedState);
    assertThat(result.seasonEvidence()).isEqualTo(expectedEvidence);
    verify(ffvbHttp).page(root);
    if (expectedState == SourceValidationStateEnum.INVALID) {
      verify(ffvbHttp).page(calendar);
      assertThat(result.reasonType()).isEqualTo(URI.create("urn:blockout:acquisition:structure"));
    }
    verifyNoMoreInteractions(ffvbHttp);
    verifyNoInteractions(lnvHttp);
  }

  @Test
  @DisplayName("Qualification uses the admitted historical FFVB selector and only sends validation")
  void qualifiesAdmittedFfvbArchive() {
    // Given
    CollectionBackend backend = mock(CollectionBackend.class);
    CollectorLifecycle lifecycle = new CollectorLifecycle(backend);
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    UUID source = UUID.fromString("00000000-0000-4000-8000-000000000151");
    URI url = URI.create("https://www.ffvbbeach.org/ffvbapp/resu/seniors/2023-2024/index.htm");
    CollectionBackend.Candidate candidate =
        new CollectionBackend.Candidate(url, "2023/2024", CollectionProviderEnum.FFVB, "ABCCS");
    when(backend.admit(any())).thenAnswer(call -> runningCandidate(call.getArgument(0), candidate));
    CollectorLifecycle.AdmittedCycle context = lifecycle.admit(null, source, 7, null);
    clearInvocations(backend);
    ProviderPages ffvbHttp = mock(ProviderPages.class);
    ProviderPages lnvHttp = mock(ProviderPages.class);
    byte[] page =
        """
        <form><span>Elite</span><select>
          <option value="/ffvbapp/resu/vbspo_calendrier.php?saison=2023/2024&amp;codent=ABCCS&amp;poule=EA">Elite A</option>
        </select></form>
        """
            .getBytes(StandardCharsets.UTF_8);
    when(ffvbHttp.page(url)).thenReturn(new ProviderResponse(page, url, true));
    Clock clock = Clock.fixed(Instant.EPOCH, ZoneOffset.UTC);
    LnvDiscovery lnv = new LnvDiscovery();
    DiscoverSeasonSources discovery =
        new DiscoverSeasonSources(
            ffvbHttp, lnvHttp, new FfvbDiscovery(), lnv, backend, lifecycle, clock);
    QualifySource service = new QualifySource(lnvHttp, lnv, discovery, lifecycle, clock);

    // When
    service.execute(context);

    // Then
    verify(ffvbHttp).page(url);
    verifyNoMoreInteractions(ffvbHttp);
    verifyNoInteractions(lnvHttp);
    verify(backend)
        .validate(
            source,
            new CollectionBackend.Validation(
                context.getCycle().id(),
                SourceValidationStateEnum.QUALIFIED,
                Instant.EPOCH,
                "2023/2024",
                null,
                null));
    verifyNoMoreInteractions(backend);
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
    doReturn(new ProviderResponse(page, url, true)).when(http).page(url);
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
    doReturn(
            new ProviderResponse(
                page,
                URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=999"),
                true))
        .when(http)
        .page(url);
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
    if (unavailable) {
      doThrow(new java.io.UncheckedIOException(new IOException("Synthetic transport failure")))
          .when(http)
          .page(url);
    } else {
      doReturn(
              new ProviderResponse(
                  "<html>Unsupported synthetic content</html>".getBytes(StandardCharsets.UTF_8),
                  url,
                  true))
          .when(http)
          .page(url);
    }
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
