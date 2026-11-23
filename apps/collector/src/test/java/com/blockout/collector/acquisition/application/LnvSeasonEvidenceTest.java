package com.blockout.collector.acquisition.application;

import static com.blockout.collector.acquisition.application.CollectionCycleFixture.completed;
import static com.blockout.collector.acquisition.application.CollectionCycleFixture.runningControl;
import static org.assertj.core.api.Assertions.tuple;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.ffvb.FfvbDiscovery;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.acquisition.lnv.LnvCalendarParser;
import com.blockout.collector.acquisition.lnv.LnvDetailParser;
import com.blockout.collector.acquisition.lnv.LnvDiscovery;
import com.blockout.collector.acquisition.lnv.LnvDocumentReferences;
import com.blockout.collector.acquisition.lnv.LnvObservationReader;
import com.blockout.collector.acquisition.lnv.LnvStandingsParser;
import com.blockout.collector.config.AcquisitionProperties;
import com.blockout.collector.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.CollectionStageEnum;
import com.blockout.collector.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.collector.generated.ingestion.model.SourceValidationStateEnum;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;

/** Exercises real qualification, discovery and passage decisions with controlled external ports. */
@DisplayName("LNV season evidence across collector operations")
class LnvSeasonEvidenceTest {
  private static final String SEASON = "2026/2027";
  private static final Instant NOW = Instant.parse("2026-11-23T09:00:00Z");
  private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000153");
  private static final UUID POOL = UUID.fromString("00000000-0000-4000-8000-000000000154");
  private static final UUID BINDING = UUID.fromString("00000000-0000-4000-8000-000000000155");
  private static final URI HOME =
      URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901");
  private static final URI REGULAR = HOME.resolve("CompetitionMatches.aspx?ID=901&PID=902");
  private static final URI PLAYOFFS = HOME.resolve("CompetitionMatches.aspx?ID=901&PID=904");

  @ParameterizedTest(name = "{0}")
  @CsvSource(
      delimiter = '|',
      value = {
        "Out-of-season date without a season heading | Alterna VOLSTAR | 17/10/2023 - 23:30 | false | LNV phase match dates contradict the season",
        "Out-of-season heading with an in-season date | Alterna VOLSTAR 2023/2024 | 17/10/2026 - 23:30 | false | LNV phase belongs to a different season",
        "Out-of-season date on a phase also serving as the root | Alterna VOLSTAR 2026/2027 | 17/10/2023 - 23:30 | true | LNV phase match dates contradict the season"
      })
  @DisplayName(
      "Contradictory publication is refused while a valid linked phase remains discoverable")
  void refusesContradictoryPublication(
      String scenario, String heading, String date, boolean phaseRoot, String reason)
      throws IOException {
    // Given
    String links = "<a href='%s'>Regular</a><a href='%s'>Playoffs</a>".formatted(REGULAR, PLAYOFFS);
    String html;
    try (InputStream input = getClass().getResourceAsStream("/acquisition/lnv/calendar.html")) {
      html = new String(input.readAllBytes(), StandardCharsets.UTF_8);
    }
    ProviderResponse publication =
        response(
            REGULAR,
            "<title>" + heading + "</title>" + links + html.replace("17/10/2026 - 23:30", date));
    URI root = phaseRoot ? REGULAR : HOME;
    ProviderPages qualificationHttp = mock(ProviderPages.class);
    when(qualificationHttp.page(REGULAR)).thenReturn(publication);
    ProviderPages discoveryHttp = mock(ProviderPages.class);
    if (!phaseRoot) {
      when(discoveryHttp.page(HOME))
          .thenReturn(response(HOME, "<title>Alterna VOLSTAR 2026/2027</title>" + links));
    }
    when(discoveryHttp.page(REGULAR)).thenReturn(publication);
    when(discoveryHttp.page(PLAYOFFS))
        .thenReturn(
            response(
                PLAYOFFS,
                """
        <div class='rmpView' id='Content_Main_905'><span id='group_lbl_title'>Playoffs</span>
          <div id='playoff_MatchRow'><span id='playoff_LB_DataOra'>10/04/2027 - 20:00</span></div>
        </div>
        """));
    ProviderHttpClient calendarHttp = mock(ProviderHttpClient.class);
    when(calendarHttp.page(REGULAR)).thenReturn(publication);

    CollectionBackend backend = mock(CollectionBackend.class);
    CollectorLifecycle lifecycle = new CollectorLifecycle(backend);
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    when(backend.admit(any())).thenAnswer(call -> runningControl(call.getArgument(0)));
    CollectorLifecycle.AdmittedCycle admitted = lifecycle.admit(CONTROL, null, 0, null);
    CollectionBackend.Target source =
        CollectionBackend.Target.builder()
            .provider(CollectionProviderEnum.LNV)
            .sourceBindingId(BINDING)
            .url(root)
            .seasonLabel(SEASON)
            .organizerReference("901")
            .build();
    CollectionBackend.Target calendar =
        source.toBuilder()
            .url(REGULAR)
            .kind(CollectionTargetKindEnum.CALENDAR)
            .scopeId(POOL)
            .poolId(POOL)
            .competitionReference("901")
            .poolReference("902")
            .groupReference("903")
            .build();
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(calendar), 0, false));
    when(backend.complete(admitted.getCycle().id(), NOW))
        .thenReturn(completed(admitted.getCycle(), NOW));
    SportingBackend sporting = mock(SportingBackend.class);
    List<SportingObservation.Calendar> submissions = new ArrayList<>();
    when(sporting.calendar(eq(POOL), any(), any()))
        .thenAnswer(
            call -> {
              submissions.add(call.getArgument(2));
              return new SportingObservation.CalendarOutcome(List.of(), 0, 0, 0, 0, true);
            });
    LnvDiscovery lnvDiscovery = new LnvDiscovery();
    DiscoverSeasonSources discovery =
        new DiscoverSeasonSources(
            discoveryHttp,
            discoveryHttp,
            new FfvbDiscovery(),
            lnvDiscovery,
            backend,
            lifecycle,
            CLOCK);
    QualifySource qualification =
        new QualifySource(qualificationHttp, lnvDiscovery, discovery, lifecycle, CLOCK);
    LnvObservationReader reader =
        new LnvObservationReader(
            calendarHttp,
            new LnvCalendarParser(),
            new LnvStandingsParser(),
            new LnvDetailParser(),
            new LnvDocumentReferences(),
            new AcquisitionProperties(
                List.of("https://www.ffvbbeach.org"),
                List.of("https://lnv-web.dataproject.com"),
                List.of("https://ign.example.invalid"),
                Duration.ofSeconds(3),
                16384,
                1,
                1,
                20,
                Duration.ofMinutes(1),
                Duration.ZERO,
                List.of()),
            CLOCK);
    CollectPassage passage =
        new CollectPassage(
            backend,
            sporting,
            mock(FfvbAcquisition.class),
            reader,
            mock(ClubSheets.class),
            mock(ClubGeocoder.class),
            discovery,
            lifecycle,
            CLOCK,
            new CollectionStageMapperImpl());
    List<DiscoverSeasonSources.PageRead> consumed = new ArrayList<>();

    // When
    QualifySource.Evidence qualified =
        qualification.qualify(
            new CollectionBackend.Candidate(REGULAR, SEASON, CollectionProviderEnum.LNV, "901"));
    DiscoverSeasonSources.Read read = discovery.catalog(source, false, () -> 1, consumed::add);
    passage.execute(admitted);

    // Then
    verify(qualificationHttp).page(REGULAR);
    verifyNoMoreInteractions(qualificationHttp);
    if (!phaseRoot) {
      verify(discoveryHttp).page(HOME);
    }
    verify(discoveryHttp).page(REGULAR);
    verify(discoveryHttp).page(PLAYOFFS);
    verifyNoMoreInteractions(discoveryHttp);
    verify(calendarHttp).page(REGULAR);
    verifyNoMoreInteractions(calendarHttp);
    ArgumentCaptor<CollectionBackend.Result> results =
        ArgumentCaptor.forClass(CollectionBackend.Result.class);
    verify(backend, atLeastOnce()).record(eq(admitted.getCycle().id()), results.capture());
    assertSoftly(
        softly -> {
          softly.assertThat(qualified.state()).isEqualTo(SourceValidationStateEnum.INVALID);
          softly.assertThat(read.catalog().complete()).isFalse();
          softly.assertThat(read.reason()).isEqualTo(reason);
          softly
              .assertThat(read.catalog().pools())
              .extracting(SportingObservation.Pool::poolReference)
              .containsExactly("904");
          softly
              .assertThat(consumed)
              .extracting(page -> page.response().url())
              .containsExactly(PLAYOFFS);
          softly.assertThat(submissions).isEmpty();
          softly
              .assertThat(results.getAllValues())
              .extracting(
                  CollectionBackend.Result::stage,
                  CollectionBackend.Result::phase,
                  CollectionBackend.Result::outcome,
                  CollectionBackend.Result::reasonType,
                  CollectionBackend.Result::reason)
              .containsExactly(
                  tuple(
                      CollectionStageEnum.CALENDAR,
                      CollectionPhaseEnum.ACQUISITION,
                      CollectionOutcomeEnum.FAILED,
                      URI.create("urn:blockout:acquisition:structure"),
                      reason));
        });
  }

  private ProviderResponse response(URI url, String html) {
    return new ProviderResponse(html.getBytes(StandardCharsets.UTF_8), url, true);
  }
}
