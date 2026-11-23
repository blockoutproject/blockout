package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.entry;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.ffvb.FfvbDiscovery;
import com.blockout.collector.acquisition.lnv.LnvDiscovery;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.CollectionSourceScopeEnum;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URI;
import java.nio.charset.Charset;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.apache.hc.client5.http.HttpResponseException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;

/** Native navigation over controlled HTTP responses; no external provider or backend write. */
@DisplayName("Bound-source discovery traversal")
class DiscoverSeasonSourcesTest {
  @Test
  @DisplayName("An unavailable seasonal catalog retains its technical failure category")
  void retainsCatalogTransportFailure() {
    // Given
    URI root = URI.create("https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php");
    UncheckedIOException unavailable =
        new UncheckedIOException(new HttpResponseException(500, "Synthetic unavailable source"));
    ProviderPages http = mock(ProviderPages.class);
    doThrow(unavailable).when(http).page(root);
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

    // When / Then
    assertThatThrownBy(() -> readCatalog(service, target))
        .isInstanceOfSatisfying(
            RuntimeException.class,
            failure ->
                assertThat(AcquisitionFailure.reasonType(failure))
                    .isEqualTo(URI.create("urn:blockout:acquisition:technical")));
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName("An unavailable frame preserves discovered siblings as a partial catalog")
  void retainsPartialFrameCatalog(boolean supportedOrigin) {
    // Given
    URI root = URI.create("https://www.ffvbbeach.org/ffvbapp/resu/seniors/2026-2027/index.htm");
    URI selector = root.resolve("pbscript.htm");
    URI missing =
        supportedOrigin
            ? root.resolve("unavailable.htm")
            : URI.create("http://www.ffvbbeach.org/ffvbapp/resu/unavailable.htm");
    ProviderPages http = mock(ProviderPages.class);
    doReturn(
            response(
                root,
                "<frameset><frame src='pbscript.htm'><frame src='%s'></frameset>"
                    .formatted(missing)))
        .when(http)
        .page(root);
    doReturn(
            response(
                selector,
                """
        <form><span>Elite</span><select><option value="https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2026/2027&codent=ABCCS&poule=EA">Elite A</option></select></form>
        """))
        .when(http)
        .page(selector);
    doThrow(
            supportedOrigin
                ? new UncheckedIOException(
                    new HttpResponseException(503, "Synthetic unavailable frame"))
                : new IllegalArgumentException("Unsupported provider origin"))
        .when(http)
        .page(missing);
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
    DiscoverSeasonSources.Read read = readCatalog(service, target);

    // Then
    assertThat(read.catalog().complete()).isFalse();
    assertThat(read.catalog().pools())
        .extracting(SportingObservation.Pool::poolReference)
        .containsExactly("EA");
    assertThat(read.observedAt()).isEqualTo(Instant.EPOCH);
    assertThat(read.reasonType())
        .isEqualTo(
            URI.create(
                supportedOrigin
                    ? "urn:blockout:acquisition:technical"
                    : "urn:blockout:acquisition:structure"));
    assertThat(read.reason()).isEqualTo(supportedOrigin ? "Provider HTTP 503" : null);
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
    ProviderPages http = mock(ProviderPages.class);
    doReturn(response(round, html)).when(http).page(round);
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
    assertThatThrownBy(() -> readCatalog(service, target))
        .isInstanceOf(FfvbAcquisitionException.class)
        .satisfies(
            failure ->
                assertThat(AcquisitionFailure.reasonType((RuntimeException) failure))
                    .isEqualTo(URI.create("urn:blockout:acquisition:structure")));
  }

  @Test
  @DisplayName("A contradictory LNV season never reaches a shared-page consumer")
  void validatesBeforeConsumption() {
    // Given
    URI url = URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=902");
    ProviderPages http = mock(ProviderPages.class);
    doReturn(
            response(
                url,
                "<title>Alterna VOLSTAR 2027/2028</title><a href='CompetitionMatches.aspx?ID=901&PID=902'>Regular</a>"))
        .when(http)
        .page(url);
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
    assertThatThrownBy(() -> service.catalog(target, false, () -> 1, consumed::add))
        .hasMessage("LNV championship belongs to a different season");
    assertThat(consumed).isEmpty();
  }

  @Test
  @DisplayName("A championship standings link without PID remains exactly as published")
  void retainsChampionshipStandings() {
    // Given
    URI url = URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=902");
    ProviderPages http = mock(ProviderPages.class);
    doReturn(
            response(
                url,
                "<title>Alterna VOLSTAR 2026/2027</title><a href='CompetitionMatches.aspx?ID=901&PID=902'>Regular</a><a href='CompetitionStandings.aspx?ID=901'>Table</a><div class=rmpView id=Content_Main_903><span id=g_lbl_title>Group</span></div>"))
        .when(http)
        .page(url);
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
    DiscoverSeasonSources.Read read = readCatalog(service, target);

    // Then
    assertThat(read.catalog().pools().getFirst().standingsUrl())
        .isEqualTo(url.resolve("CompetitionStandings.aspx?ID=901"));
  }

  @Test
  @DisplayName("An updated qualified LNV championship publishes its newly listed playoffs")
  void discoversLaterPublishedPhase() {
    // Given
    URI root = URI.create("https://lnv-web.dataproject.com/CompetitionStandings.aspx?ID=901");
    URI regular = root.resolve("CompetitionMatches.aspx?ID=901&PID=902");
    URI playoffs = root.resolve("CompetitionMatches.aspx?ID=901&PID=904");
    String standings =
        "<title>Site de comp&eacute;tition par Data Project</title>"
            + "<h1 class='CompetitionDescription_Header'>Alterna VOLSTAR</h1>";
    String regularLink = "<a href='" + regular + "'>Calendrier</a>";
    String playoffsLink = "<a href='" + playoffs + "'>Playoffs</a>";
    ProviderPages http = mock(ProviderPages.class);
    when(http.page(root))
        .thenReturn(
            response(root, standings + regularLink),
            response(root, standings + playoffsLink + regularLink));
    when(http.page(regular))
        .thenReturn(
            response(
                regular,
                "<div id='Content_Main_LYR_Header_ChampionshipMatches'><h3>Saison R&eacute;guli&egrave;re</h3></div>"
                    + lnvGroup("903", "Groupe A", "17/10/2026 - 20:00", "06/03/2027 - 19:30")));
    when(http.page(playoffs))
        .thenReturn(response(playoffs, lnvGroup("905", "Groupe B", "10/04/2027 - 20:00")));
    DiscoverSeasonSources service = discovery(http);
    CollectionBackend.Target target = lnvTarget(root);
    List<DiscoverSeasonSources.PageRead> consumed = new ArrayList<>();

    // When
    DiscoverSeasonSources.Read first = readCatalog(service, target);
    DiscoverSeasonSources.Read updated = service.catalog(target, false, () -> 1, consumed::add);

    // Then
    assertThat(first.catalog().complete()).isTrue();
    assertThat(first.catalog().pools())
        .extracting(SportingObservation.Pool::poolReference)
        .containsExactly("902");
    assertThat(updated.catalog().complete()).isTrue();
    assertThat(updated.catalog().pools())
        .extracting(SportingObservation.Pool::poolReference)
        .containsExactly("904", "902");
    assertThat(updated.catalog().pools().getFirst().sourceName()).isEqualTo("Groupe B");
    assertThat(updated.catalog().phaseLabels())
        .containsOnly(entry("902", "Saison Régulière"), entry("904", "Playoffs"));
    assertThat(consumed).extracting(read -> read.response().url()).containsExactly(regular);
  }

  @ParameterizedTest
  @EnumSource(PhaseContextMismatch.class)
  @DisplayName("An LNV phase with contradictory context cannot establish a phase or absence")
  void refusesMisattributedPhase(PhaseContextMismatch mismatch) {
    // Given
    URI root = URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901");
    URI regular = root.resolve("CompetitionMatches.aspx?ID=901&PID=902");
    URI other = root.resolve("CompetitionMatches.aspx?ID=901&PID=904");
    URI actual =
        switch (mismatch) {
          case CHAMPIONSHIP -> root.resolve("CompetitionMatches.aspx?ID=999&PID=904");
          case PHASE -> root.resolve("CompetitionMatches.aspx?ID=901&PID=999");
          case SEASON -> other;
        };
    String phaseMarkup =
        (mismatch == PhaseContextMismatch.SEASON ? "<title>Alterna VOLSTAR 2027/2028</title>" : "")
            + lnvGroup("905", "Unexpected phase");
    ProviderPages http = mock(ProviderPages.class);
    when(http.page(root))
        .thenReturn(
            response(
                root,
                "<title>Alterna VOLSTAR 2026/2027</title><a href='"
                    + regular
                    + "'>Regular</a>"
                    + "<a href='"
                    + other
                    + "'>Playoffs</a>"));
    when(http.page(regular)).thenReturn(response(regular, lnvGroup("903", "Regular")));
    when(http.page(other)).thenReturn(response(actual, phaseMarkup));
    List<DiscoverSeasonSources.PageRead> consumed = new ArrayList<>();

    // When
    DiscoverSeasonSources.Read read =
        discovery(http).catalog(lnvTarget(root), false, () -> 1, consumed::add);

    // Then
    assertThat(read.catalog().complete()).isFalse();
    assertThat(read.catalog().pools())
        .extracting(SportingObservation.Pool::poolReference)
        .containsExactly("902");
    assertThat(read.catalog().phaseLabels()).containsOnly(entry("902", "Regular"));
    assertThat(read.reason()).startsWith("LNV phase ");
    assertThat(consumed).extracting(page -> page.response().url()).containsExactly(regular);
  }

  private enum PhaseContextMismatch {
    CHAMPIONSHIP,
    PHASE,
    SEASON
  }

  @Test
  @DisplayName("An operator-confirmed historical season can qualify a calendar without dates")
  void retainsVerifiedHistoricalScope() {
    // Given
    URI phase =
        URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=902");
    ProviderPages http = mock(ProviderPages.class);
    when(http.page(phase))
        .thenReturn(
            response(
                phase,
                "<title>Marmara SpikeLigue</title><a href='?ID=901&PID=902'>Regular</a>"
                    + lnvGroup("903", "Regular")));
    DiscoverSeasonSources service = discovery(http);
    CollectionBackend.Target target = lnvTarget(phase);

    // When / Then
    assertThatThrownBy(() -> readCatalog(service, target))
        .hasMessage("LNV championship has no published season");
    DiscoverSeasonSources.Read historical = service.catalog(target, true, () -> 1, ignored -> {});
    assertThat(historical.catalog().complete()).isTrue();
    assertThat(historical.catalog().pools())
        .extracting(SportingObservation.Pool::poolReference)
        .containsExactly("902");
  }

  @Test
  @DisplayName("An unavailable current FFVB menu does not prevent an independent neighbor proposal")
  void continuesNeighborAfterFailure() {
    // Given
    URI entry = URI.create("https://www.ffvb.org/120-37-1-Championnats-Regionaux");
    URI broken = URI.create("https://www.ffvbbeach.org/ffvbapp/resu/broken.htm");
    URI valid = URI.create("https://www.ffvbbeach.org/ffvbapp/resu/valid.htm");
    ProviderPages http = mock(ProviderPages.class);
    doThrow(new java.io.UncheckedIOException(new IOException("Unavailable fixture")))
        .when(http)
        .page(any());
    doReturn(
            response(
                entry,
                "<a href='"
                    + broken
                    + "'>First</a><iframe src='"
                    + valid
                    + "'></iframe><a href='"
                    + valid
                    + "'>Ligue Auvergne Rhône-Alpes</a>"))
        .when(http)
        .page(entry);
    doReturn(
            response(
                valid,
                "<span>Regional</span><select><option value='vbspo_calendrier.php?saison=2026/2027&codent=LIRA&poule=AA'>Pool</option></select>"))
        .when(http)
        .page(valid);
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
    assertThat(proposal.getValue().scope()).isEqualTo(CollectionSourceScopeEnum.REGIONAL);
    assertThat(proposal.getValue().displayName()).isEqualTo("Ligue Auvergne Rhône-Alpes");
    verify(http).page(valid);
  }

  @ParameterizedTest(name = "{1} uses its published championship and season")
  @CsvSource({
    "saforelle-volstar, Saforelle VOLSTAR, 971, 981",
    "alterna-volstar, Alterna VOLSTAR, 972, 982",
    "volstar-masculine-2, VOLSTAR Masculine 2, 973, 983"
  })
  @DisplayName("A seasonless standings root is discovered through its published calendar")
  void discoversLnvSeasonThroughCalendar(
      String entryPath, String publishedName, String championship, String phase) {
    // Given
    URI entry = URI.create("https://www.lnv.fr/competitions/" + entryPath);
    URI root =
        URI.create("https://lnv-web.dataproject.com/CompetitionStandings.aspx?ID=" + championship);
    URI calendar = root.resolve("CompetitionMatches.aspx?ID=" + championship + "&PID=" + phase);
    ProviderPages http = mock(ProviderPages.class);
    doThrow(new UncheckedIOException(new IOException("Unpublished fixture")))
        .when(http)
        .page(any());
    doReturn(response(entry, "<iframe src='" + root + "'></iframe>")).when(http).page(entry);
    doReturn(
            response(
                root,
                "<title>Site de comp&eacute;tition par Data Project</title>"
                    + "<h1 class='CompetitionDescription_Header'>"
                    + publishedName
                    + "</h1><a href='"
                    + calendar
                    + "'>Calendrier</a>"))
        .when(http)
        .page(root);
    doReturn(
            response(
                calendar, lnvGroup("999", "Groupe A", "19/10/2029 - 20:00", "07/02/2030 - 20:00")))
        .when(http)
        .page(calendar);
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
    assertThat(proposal.getValue().provider()).isEqualTo(CollectionProviderEnum.LNV);
    assertThat(proposal.getValue().startYear()).isEqualTo(2029);
    assertThat(proposal.getValue().organizerReference()).isEqualTo(championship);
    assertThat(proposal.getValue().candidateUrl()).isEqualTo(root);
  }

  @Test
  @DisplayName("Conflicting published phase seasons prevent a championship proposal")
  void refusesConflictingPhaseSeasons() {
    // Given
    URI entry = URI.create("https://www.lnv.fr/competitions/alterna-volstar");
    URI root = URI.create("https://lnv-web.dataproject.com/CompetitionStandings.aspx?ID=901");
    URI regular = root.resolve("CompetitionMatches.aspx?ID=901&PID=902");
    URI other = root.resolve("CompetitionMatches.aspx?ID=901&PID=904");
    ProviderPages http = mock(ProviderPages.class);
    doThrow(new UncheckedIOException(new IOException("Unpublished fixture")))
        .when(http)
        .page(any());
    doReturn(response(entry, "<iframe src='" + root + "'></iframe>")).when(http).page(entry);
    doReturn(
            response(
                root,
                """
                <title>Alterna VOLSTAR</title>
                <a href="CompetitionMatches.aspx?ID=901&PID=902">Regular</a>
                <a href="CompetitionMatches.aspx?ID=901&PID=904">Other phase</a>
                """))
        .when(http)
        .page(root);
    doReturn(
            response(
                regular, lnvGroup("903", "Groupe A", "17/10/2026 - 20:00", "06/03/2027 - 19:30")))
        .when(http)
        .page(regular);
    doReturn(
            response(
                other, lnvGroup("905", "Groupe B", "16/10/2027 - 20:00", "01/04/2028 - 20:00")))
        .when(http)
        .page(other);
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
    verifyNoInteractions(backend);
  }

  @ParameterizedTest
  @ValueSource(strings = {"ID=901&ID=902", "ID&ID=902"})
  @DisplayName("An ambiguous LNV entry cannot select a championship to fetch")
  void refusesConflictingChampionshipReference(String parameters) {
    // Given
    URI entry = URI.create("https://www.lnv.fr/competitions/saforelle-volstar");
    URI ambiguous =
        URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?" + parameters);
    ProviderPages http = mock(ProviderPages.class);
    doThrow(new UncheckedIOException(new IOException("Unpublished fixture")))
        .when(http)
        .page(any());
    doReturn(response(entry, "<iframe src='" + ambiguous + "'></iframe>")).when(http).page(entry);
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
    verify(http, never()).page(ambiguous);
    verifyNoInteractions(backend);
  }

  /**
   * A failed supersession inspection must not discard independent source-entry opportunities. The
   * generated HTTP boundary is replaced; the real lifecycle owns conflict inspection.
   */
  @Test
  @DisplayName("A refused proposal with unavailable runtime leaves independent entries eligible")
  void continuesAfterUnconfirmedRuntimeInspection() {
    // Given
    CollectionBackend backend = mock(CollectionBackend.class);
    CollectorLifecycle lifecycle = new CollectorLifecycle(backend);
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    when(backend.current())
        .thenThrow(new CollectionBackendFailure(CollectionBackendFailure.Kind.UNCONFIRMED, null));
    ProviderPages http = mock(ProviderPages.class);
    doThrow(new java.io.UncheckedIOException(new IOException("Unavailable fixture")))
        .when(http)
        .page(any());
    URI firstEntry = URI.create("https://www.lnv.fr/competitions/saforelle-volstar");
    URI nextEntry = URI.create("https://www.lnv.fr/competitions/alterna-volstar");
    URI firstCandidate = URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901");
    URI nextCandidate = URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=902");
    doReturn(response(firstEntry, "<iframe src='" + firstCandidate + "'></iframe>"))
        .when(http)
        .page(firstEntry);
    doReturn(response(nextEntry, "<iframe src='" + nextCandidate + "'></iframe>"))
        .when(http)
        .page(nextEntry);
    doReturn(
            response(
                firstCandidate,
                "<title>Saforelle VOLSTAR 2026/2027</title><a href='CompetitionMatches.aspx?ID=901&PID=903'>Phase</a>"))
        .when(http)
        .page(firstCandidate);
    doReturn(
            response(
                nextCandidate,
                "<title>Alterna VOLSTAR 2026/2027</title><a href='CompetitionMatches.aspx?ID=902&PID=904'>Phase</a>"))
        .when(http)
        .page(nextCandidate);
    doThrow(new CollectionBackendFailure(CollectionBackendFailure.Kind.CONFLICT, null))
        .doNothing()
        .when(backend)
        .observeSource(any());
    DiscoverSeasonSources service =
        new DiscoverSeasonSources(
            http,
            http,
            new FfvbDiscovery(),
            new LnvDiscovery(),
            backend,
            lifecycle,
            Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

    // When
    service.currentEntries();

    // Then
    ArgumentCaptor<CollectionBackend.SourceProposal> proposals =
        ArgumentCaptor.forClass(CollectionBackend.SourceProposal.class);
    verify(backend, times(2)).observeSource(proposals.capture());
    assertThat(proposals.getAllValues())
        .extracting(CollectionBackend.SourceProposal::organizerReference)
        .containsExactly("901", "902");
    assertThat(lifecycle.isActive()).isTrue();
    verify(backend, times(2)).current();
  }

  @Test
  @DisplayName("A superseded discovery process stops before reading another official entry")
  void stopsAfterConfirmedSupersession() {
    // Given
    CollectionBackend backend = mock(CollectionBackend.class);
    CollectorLifecycle lifecycle = new CollectorLifecycle(backend);
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    when(backend.current())
        .thenReturn(
            new CollectionBackend.Runtime(
                2, UUID.fromString("00000000-0000-4000-8000-000000000199")));
    ProviderPages http = mock(ProviderPages.class);
    doThrow(new java.io.UncheckedIOException(new IOException("Unavailable fixture")))
        .when(http)
        .page(any());
    URI entry = URI.create("https://www.lnv.fr/competitions/saforelle-volstar");
    URI nextEntry = URI.create("https://www.lnv.fr/competitions/alterna-volstar");
    URI candidate = URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901");
    doReturn(response(entry, "<iframe src='" + candidate + "'></iframe>")).when(http).page(entry);
    doReturn(
            response(
                candidate,
                "<title>Saforelle VOLSTAR 2026/2027</title><a href='CompetitionMatches.aspx?ID=901&PID=903'>Phase</a>"))
        .when(http)
        .page(candidate);
    doThrow(new CollectionBackendFailure(CollectionBackendFailure.Kind.CONFLICT, null))
        .when(backend)
        .observeSource(any());
    DiscoverSeasonSources service =
        new DiscoverSeasonSources(
            http,
            http,
            new FfvbDiscovery(),
            new LnvDiscovery(),
            backend,
            lifecycle,
            Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

    // When / Then
    assertThatThrownBy(service::currentEntries).isInstanceOf(IllegalStateException.class);
    assertThat(lifecycle.isActive()).isFalse();
    verify(http, never()).page(nextEntry);
    verify(backend).observeSource(any());
  }

  /**
   * Encodes a complete synthetic source response without changing its final URL.
   *
   * @param url source response context
   * @param html synthetic native markup
   * @return completed bounded transport response
   */
  private ProviderResponse response(URI url, String html) {
    return new ProviderResponse(html.getBytes(Charset.forName("windows-1252")), url, true);
  }

  private DiscoverSeasonSources.Read readCatalog(
      DiscoverSeasonSources service, CollectionBackend.Target target) {
    return service.catalog(target, false, () -> 1, ignored -> {});
  }

  private DiscoverSeasonSources discovery(ProviderPages http) {
    return new DiscoverSeasonSources(
        http,
        http,
        new FfvbDiscovery(),
        new LnvDiscovery(),
        mock(CollectionBackend.class),
        mock(CollectorLifecycle.class),
        Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));
  }

  private CollectionBackend.Target lnvTarget(URI root) {
    return CollectionBackend.Target.builder()
        .provider(CollectionProviderEnum.LNV)
        .url(root)
        .seasonLabel("2026/2027")
        .organizerReference("901")
        .build();
  }

  private String lnvGroup(String id, String label, String... dates) {
    StringBuilder rows = new StringBuilder();
    for (int index = 0; index < dates.length; index++) {
      rows.append(
          "<div id='row%d_MatchRow'><span id='row%d_LB_DataOra'>%s</span></div>"
              .formatted(index, index, dates[index]));
    }
    return "<div class='rmpView' id='Content_Main_"
        + id
        + "'><span id='group_lbl_title'>"
        + label
        + "</span>"
        + rows
        + "</div>";
  }
}
