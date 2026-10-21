package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.ffvb.FfvbDiscovery;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.acquisition.lnv.LnvDiscovery;
import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.CollectionStageEnum;
import com.blockout.collector.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.collector.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.collector.generated.ingestion.model.StandingsPublicationStateEnum;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

/** Isolates passage decisions while using real lifecycle-issued admitted capabilities. */
@ExtendWith(OutputCaptureExtension.class)
@DisplayName("Bounded admitted passage and uncertain terminal writes")
class CollectPassageTest {
  private static final Instant NOW = Instant.parse("2026-10-19T12:00:00Z");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000153");
  private static final UUID POOL = UUID.fromString("00000000-0000-4000-8000-000000000154");
  private final CollectionBackend backend = mock(CollectionBackend.class);
  private final SportingBackend sporting = mock(SportingBackend.class);
  private static final URI SOURCE =
      URI.create("https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?calend=COMPLET");
  private final LnvAcquisition lnv = mock(LnvAcquisition.class);
  private final DiscoverSeasonSources discovery = mock(DiscoverSeasonSources.class);
  private final FfvbAcquisition ffvb = mock(FfvbAcquisition.class);
  private final FfvbAcquisition.Resource resource = mock(FfvbAcquisition.Resource.class);
  private final CollectorLifecycle lifecycle = new CollectorLifecycle(backend);
  private final CollectPassage passage =
      new CollectPassage(
          backend, sporting, ffvb, lnv, discovery, lifecycle, Clock.fixed(NOW, ZoneOffset.UTC));

  @Test
  @DisplayName("Complete accepted catalog removal prevents an old frozen pool from being read")
  void stopsRemovedPoolImmediately() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    CollectionBackend.Target source =
        CollectionBackend.Target.builder()
            .scopeId(CONTROL)
            .sourceBindingId(CONTROL)
            .provider(CollectionProviderEnum.FFVB)
            .kind(CollectionTargetKindEnum.DISCOVERY)
            .build();
    CollectionBackend.Target calendar =
        target(CollectionTargetKindEnum.CALENDAR).toBuilder().sourceBindingId(CONTROL).build();
    SportingObservation.Catalog empty = new SportingObservation.Catalog(true, List.of());
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(calendar, source), 0, false));
    when(discovery.catalog(eq(source), any(), any()))
        .thenReturn(new DiscoverSeasonSources.Read(empty, NOW));
    when(sporting.catalog(eq(CONTROL), any(), eq(empty)))
        .thenReturn(new SportingObservation.CatalogOutcome(List.of(), true));
    when(backend.complete(admitted.getCycle().id(), NOW)).thenReturn(completed(admitted, NOW));

    // When
    passage.execute(admitted);

    // Then
    verify(ffvb, never()).read(any());
    verify(sporting, never()).calendar(any(), any(), any());
  }

  @Test
  @DisplayName("Failed catalog discovery preserves selected same-season acquisition")
  void retainsPoolsAfterDiscoveryFailure() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    CollectionBackend.Target source =
        CollectionBackend.Target.builder()
            .scopeId(CONTROL)
            .sourceBindingId(CONTROL)
            .provider(CollectionProviderEnum.FFVB)
            .kind(CollectionTargetKindEnum.DISCOVERY)
            .build();
    CollectionBackend.Target calendar =
        target(CollectionTargetKindEnum.CALENDAR).toBuilder().sourceBindingId(CONTROL).build();
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(source, calendar), 0, false));
    when(discovery.catalog(eq(source), any(), any()))
        .thenThrow(new FfvbAcquisitionException("Unavailable catalog"));
    when(ffvb.resourceUrl(calendar)).thenReturn(SOURCE);
    when(ffvb.read(SOURCE)).thenReturn(resource);
    SportingObservation.Calendar empty =
        new SportingObservation.Calendar(true, List.of(), List.of(), List.of());
    when(resource.calendar(calendar)).thenReturn(new FfvbAcquisition.Read<>(empty, NOW));
    when(sporting.calendar(eq(POOL), any(), eq(empty)))
        .thenReturn(new SportingObservation.CalendarOutcome(List.of(), 0, 0, 0, 0, true));
    when(backend.complete(admitted.getCycle().id(), NOW)).thenReturn(completed(admitted, NOW));

    // When
    passage.execute(admitted);

    // Then
    verify(sporting).calendar(eq(POOL), any(), eq(empty));
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName(
      "Only new resolved matches get first detail while independent team image attempts remain bounded")
  void enrichesNewMatchesWithinCalendar(boolean imageUnavailable) {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    UUID newMatch = UUID.fromString("00000000-0000-4000-8000-000000000171");
    UUID oldMatch = UUID.fromString("00000000-0000-4000-8000-000000000172");
    UUID home = UUID.fromString("00000000-0000-4000-8000-000000000173");
    UUID away = UUID.fromString("00000000-0000-4000-8000-000000000174");
    URI page = URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=902");
    URI logo = URI.create("https://images.dataproject.com/lnv/home.png");
    CollectionBackend.Target target =
        target(CollectionTargetKindEnum.CALENDAR).toBuilder()
            .provider(CollectionProviderEnum.LNV)
            .url(page)
            .competitionReference("901")
            .poolReference("902")
            .groupReference("903")
            .build();
    SportingObservation.Team homeTeam = new SportingObservation.Team("Home", "01", null, null);
    SportingObservation.Team awayTeam = new SportingObservation.Team("Away", "02", null, null);
    SportingObservation.Facts facts = SportingObservation.Facts.builder().build();
    SportingObservation.Calendar calendar =
        new SportingObservation.Calendar(
            true,
            List.of(
                new SportingObservation.Match(
                    "new",
                    homeTeam,
                    awayTeam,
                    facts,
                    page.resolve("MatchStatistics.aspx?mID=new&ID=901")),
                new SportingObservation.Match(
                    "old",
                    homeTeam,
                    awayTeam,
                    facts,
                    page.resolve("MatchStatistics.aspx?mID=old&ID=901"))),
            List.of(),
            List.of());
    LnvAcquisition.Resource shared = mock(LnvAcquisition.Resource.class);
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(target), 0, false));
    when(lnv.read(page)).thenReturn(shared);
    when(shared.calendar(target))
        .thenReturn(
            new LnvAcquisition.Calendar(calendar, Map.of("01", logo, "02", logo), NOW, null));
    when(lnv.documentIndexes(any())).thenReturn((owner, evidence) -> null);
    when(sporting.calendar(eq(POOL), any(), eq(calendar)))
        .thenReturn(
            new SportingObservation.CalendarOutcome(
                List.of(
                    new SportingObservation.Outcome(
                        "new", ObservationOutcomeEnum.ACCEPTED, newMatch, null, home, away, true),
                    new SportingObservation.Outcome(
                        "old", ObservationOutcomeEnum.ACCEPTED, oldMatch, null, home, away, false)),
                2,
                0,
                0,
                0,
                true));
    LnvAcquisition.Resource detail = mock(LnvAcquisition.Resource.class);
    when(lnv.read(page.resolve("MatchStatistics.aspx?mID=new&ID=901"))).thenReturn(detail);
    when(detail.detail(any())).thenReturn(new LnvAcquisition.Read<>(facts, NOW));
    when(sporting.detail(eq(newMatch), any(), eq(facts)))
        .thenReturn(
            new SportingObservation.Outcome(
                "new", ObservationOutcomeEnum.ACCEPTED, newMatch, null, null, null));
    if (imageUnavailable)
      when(lnv.image(logo)).thenThrow(new IllegalArgumentException("Unavailable image"));
    else when(lnv.image(logo)).thenReturn(null);
    when(backend.complete(admitted.getCycle().id(), NOW)).thenReturn(completed(admitted, NOW));

    // When
    passage.execute(admitted);

    // Then
    verify(sporting).detail(eq(newMatch), any(), eq(facts));
    verify(sporting, never()).detail(eq(oldMatch), any(), any());
    verify(lnv, times(2)).image(logo);
    verify(sporting, never()).logo(any(), any(), any());
    ArgumentCaptor<CollectionBackend.Result> evidence =
        ArgumentCaptor.forClass(CollectionBackend.Result.class);
    verify(backend, times(imageUnavailable ? 6 : 4))
        .record(eq(admitted.getCycle().id()), evidence.capture());
    assertThat(
            evidence.getAllValues().stream()
                .filter(item -> item.stage() == CollectionStageEnum.LOGO)
                .toList())
        .hasSize(imageUnavailable ? 2 : 0)
        .allSatisfy(item -> assertThat(item.outcome()).isEqualTo(CollectionOutcomeEnum.FAILED));
  }

  @Test
  @DisplayName(
      "Discovery and an admitted LNV calendar consume one page with its original timestamp")
  void sharesDiscoveryPage() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    URI page = URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=902");
    CollectionBackend.Target source =
        CollectionBackend.Target.builder()
            .scopeId(CONTROL)
            .sourceBindingId(CONTROL)
            .provider(CollectionProviderEnum.LNV)
            .kind(CollectionTargetKindEnum.DISCOVERY)
            .url(page)
            .seasonLabel("2026/2027")
            .organizerReference("901")
            .build();
    CollectionBackend.Target calendar =
        target(CollectionTargetKindEnum.CALENDAR).toBuilder()
            .provider(CollectionProviderEnum.LNV)
            .sourceBindingId(CONTROL)
            .url(page)
            .build();
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    byte[] html =
        ("<title>Alterna VOLSTAR 2026/2027</title>"
                + "<a href='CompetitionMatches.aspx?ID=901&PID=902'>Regular</a>"
                + "<div class=rmpView id=Content_Main_903><span id=group_lbl_title>Regular</span></div>")
            .getBytes(StandardCharsets.UTF_8);
    ProviderHttpClient.Response response = new ProviderHttpClient.Response(html, page, true);
    when(http.page(page)).thenReturn(CompletableFuture.completedFuture(response));
    DiscoverSeasonSources realDiscovery =
        new DiscoverSeasonSources(
            http,
            http,
            new FfvbDiscovery(),
            new LnvDiscovery(),
            backend,
            lifecycle,
            Clock.fixed(NOW, ZoneOffset.UTC));
    CollectPassage sharedPassage =
        new CollectPassage(
            backend,
            sporting,
            ffvb,
            lnv,
            realDiscovery,
            lifecycle,
            Clock.fixed(NOW, ZoneOffset.UTC));
    LnvAcquisition.Resource shared = mock(LnvAcquisition.Resource.class);
    SportingObservation.Calendar empty =
        new SportingObservation.Calendar(true, List.of(), List.of(), List.of());
    when(lnv.fromPage(response, NOW)).thenReturn(shared);
    when(shared.calendar(calendar))
        .thenReturn(new LnvAcquisition.Calendar(empty, Map.of(), NOW, null));
    when(lnv.documentIndexes(any())).thenReturn((owner, evidence) -> null);
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(source, calendar), 0, false));
    when(sporting.calendar(eq(POOL), any(), eq(empty)))
        .thenReturn(new SportingObservation.CalendarOutcome(List.of(), 0, 0, 0, 0, true));
    when(sporting.catalog(eq(CONTROL), any(), any()))
        .thenReturn(
            new SportingObservation.CatalogOutcome(
                List.of(
                    new SportingObservation.Outcome(
                        "902", ObservationOutcomeEnum.ACCEPTED, POOL, null, null, null)),
                true));
    when(backend.complete(admitted.getCycle().id(), NOW)).thenReturn(completed(admitted, NOW));

    // When
    sharedPassage.execute(admitted);

    // Then
    verify(http).page(page);
    verify(lnv, never()).read(any());
    ArgumentCaptor<SportingObservation.Context> context =
        ArgumentCaptor.forClass(SportingObservation.Context.class);
    verify(sporting).calendar(eq(POOL), context.capture(), eq(empty));
    assertThat(context.getValue().observedAt()).isEqualTo(NOW);
  }

  @Test
  @DisplayName(
      "A refused information-sheet association remains visible after a successful detail read")
  void preservesDocumentRefusal() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    UUID match = UUID.fromString("00000000-0000-4000-8000-000000000171");
    URI page = URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=902");
    URI detailUrl = page.resolve("MatchStatistics.aspx?ID=901&mID=990");
    CollectionBackend.Target calendarTarget =
        target(CollectionTargetKindEnum.CALENDAR).toBuilder()
            .provider(CollectionProviderEnum.LNV)
            .url(page)
            .build();
    CollectionBackend.Target detailTarget =
        calendarTarget.toBuilder()
            .kind(CollectionTargetKindEnum.DETAILS)
            .scopeId(match)
            .matchId(match)
            .url(detailUrl)
            .build();
    SportingObservation.Facts facts = SportingObservation.Facts.builder().build();
    SportingObservation.Team home = new SportingObservation.Team("Home", "01", null, null);
    SportingObservation.Team away = new SportingObservation.Team("Away", "02", null, null);
    SportingObservation.Calendar calendar =
        new SportingObservation.Calendar(
            true,
            List.of(new SportingObservation.Match("990", home, away, facts, detailUrl)),
            List.of(),
            List.of());
    LnvAcquisition.Resource calendarResource = mock(LnvAcquisition.Resource.class);
    LnvAcquisition.Resource detailResource = mock(LnvAcquisition.Resource.class);
    SportingObservation.InformationSheet sheet =
        new SportingObservation.InformationSheet("2026/2027", "AALNV", "001");
    SportingObservation.Facts documentFacts =
        SportingObservation.Facts.builder().informationSheet(JsonNullable.of(sheet)).build();
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(
            new CollectionBackend.TargetPage(List.of(calendarTarget, detailTarget), 0, false));
    when(lnv.read(page)).thenReturn(calendarResource);
    when(calendarResource.calendar(calendarTarget))
        .thenReturn(new LnvAcquisition.Calendar(calendar, Map.of(), NOW, "LAM"));
    when(lnv.documentIndexes(any()))
        .thenReturn(
            (owner, evidence) -> new LnvAcquisition.DocumentRead(Map.of("990", sheet), NOW, 1));
    when(sporting.calendar(eq(POOL), any(), eq(calendar)))
        .thenReturn(
            new SportingObservation.CalendarOutcome(
                List.of(
                    new SportingObservation.Outcome(
                        "990", ObservationOutcomeEnum.ACCEPTED, match, null, null, null, false)),
                1,
                0,
                0,
                0,
                true));
    when(sporting.detail(eq(match), any(), eq(documentFacts)))
        .thenReturn(
            new SportingObservation.Outcome(
                "990",
                ObservationOutcomeEnum.REJECTED,
                match,
                URI.create("urn:blockout:document-refused"),
                null,
                null));
    when(lnv.read(detailUrl)).thenReturn(detailResource);
    when(detailResource.detail(detailTarget)).thenReturn(new LnvAcquisition.Read<>(facts, NOW));
    when(sporting.detail(eq(match), any(), eq(facts)))
        .thenReturn(
            new SportingObservation.Outcome(
                "990", ObservationOutcomeEnum.ACCEPTED, match, null, null, null));
    when(backend.complete(admitted.getCycle().id(), NOW)).thenReturn(completed(admitted, NOW));

    // When
    passage.execute(admitted);

    // Then
    ArgumentCaptor<SportingObservation.Context> documentContext =
        ArgumentCaptor.forClass(SportingObservation.Context.class);
    verify(sporting).detail(eq(match), documentContext.capture(), eq(documentFacts));
    assertThat(documentContext.getValue().readOrdinal()).isEqualTo(1);
    ArgumentCaptor<CollectionBackend.Result> results =
        ArgumentCaptor.forClass(CollectionBackend.Result.class);
    verify(backend, atLeastOnce()).record(eq(admitted.getCycle().id()), results.capture());
    CollectionBackend.Result last =
        results.getAllValues().stream()
            .filter(
                item ->
                    item.scopeId().equals(match) && item.phase() == CollectionPhaseEnum.INTEGRATION)
            .reduce((earlier, later) -> later)
            .orElseThrow();
    assertThat(last.outcome()).isEqualTo(CollectionOutcomeEnum.PARTIAL);
    assertThat(last.obtainedCount()).isEqualTo(1);
    assertThat(last.rejectedCount()).isEqualTo(1);
    assertThat(last.reason()).contains("Information-sheet association", "document-refused");
  }

  @Test
  @DisplayName("Keeps independent standings when calendar acquisition fails")
  void continuesIndependentStage() {
    // Given
    when(ffvb.resourceUrl(any())).thenReturn(SOURCE);
    when(ffvb.read(SOURCE)).thenReturn(resource);
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    CollectionBackend.Target calendar = target(CollectionTargetKindEnum.CALENDAR);
    CollectionBackend.Target table = target(CollectionTargetKindEnum.STANDINGS);
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(calendar), 0, true));
    when(backend.targets(admitted.getCycle().id(), 1))
        .thenReturn(new CollectionBackend.TargetPage(List.of(table), 1, false));
    when(resource.calendar(calendar)).thenThrow(new FfvbAcquisitionException("Wrong season"));
    SportingObservation.Standings standings =
        new SportingObservation.Standings(
            StandingsPublicationStateEnum.PUBLISHED, List.of(), List.of());
    when(resource.standings(table))
        .thenReturn(new FfvbAcquisition.Read<>(standings, NOW.minusSeconds(1)));
    when(sporting.standings(eq(POOL), any(), eq(standings)))
        .thenReturn(
            new SportingObservation.Outcome(
                "TST", ObservationOutcomeEnum.ACCEPTED, POOL, null, null, null));
    when(backend.complete(admitted.getCycle().id(), NOW)).thenReturn(completed(admitted, NOW));

    // When
    boolean finished = passage.execute(admitted);

    // Then
    assertThat(finished).isTrue();
    ArgumentCaptor<CollectionBackend.Result> results =
        ArgumentCaptor.forClass(CollectionBackend.Result.class);
    verify(backend, times(3)).record(eq(admitted.getCycle().id()), results.capture());
    assertThat(results.getAllValues())
        .extracting(CollectionBackend.Result::outcome)
        .containsExactly(
            CollectionOutcomeEnum.FAILED,
            CollectionOutcomeEnum.SUCCESS,
            CollectionOutcomeEnum.SUCCESS);
    assertThat(results.getAllValues())
        .extracting(CollectionBackend.Result::readOrdinal)
        .containsExactly(1L, 1L, 1L);
    assertThat(results.getAllValues().getFirst().reason()).isEqualTo("Wrong season");
    assertThat(results.getAllValues().get(1).observedAt()).isEqualTo(NOW.minusSeconds(1));
    verify(ffvb).read(SOURCE);
    verify(sporting, never()).calendar(any(), any(), any());
  }

  @Test
  @DisplayName(
      "Reports an uncertain sporting write without replaying it or claiming measured counts")
  void preservesUncertainIntegration() {
    // Given
    when(ffvb.resourceUrl(any())).thenReturn(SOURCE);
    when(ffvb.read(SOURCE)).thenReturn(resource);
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    CollectionBackend.Target target = target(CollectionTargetKindEnum.CALENDAR);
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(target), 0, false));
    SportingObservation.Calendar calendar =
        new SportingObservation.Calendar(true, List.of(), List.of(), List.of());
    when(resource.calendar(target)).thenReturn(new FfvbAcquisition.Read<>(calendar, NOW));
    when(sporting.calendar(eq(POOL), any(), eq(calendar))).thenThrow(uncertain());
    when(backend.complete(admitted.getCycle().id(), NOW)).thenReturn(completed(admitted, NOW));

    // When
    passage.execute(admitted);

    // Then
    verify(sporting).calendar(eq(POOL), any(), eq(calendar));
    ArgumentCaptor<CollectionBackend.Result> results =
        ArgumentCaptor.forClass(CollectionBackend.Result.class);
    verify(backend, times(2)).record(eq(admitted.getCycle().id()), results.capture());
    CollectionBackend.Result integration = results.getAllValues().getLast();
    assertThat(integration.phase()).isEqualTo(CollectionPhaseEnum.INTEGRATION);
    assertThat(integration.outcome()).isEqualTo(CollectionOutcomeEnum.UNCONFIRMED);
    assertThat(integration.obtainedCount()).isNull();
    assertThat(integration.rejectedCount()).isNull();
    verify(backend).complete(admitted.getCycle().id(), NOW);
  }

  @Test
  @DisplayName("Preserves 99 accepted matches and one rejected match as partial integration")
  void preservesPartialIntegration() {
    // Given
    when(ffvb.resourceUrl(any())).thenReturn(SOURCE);
    when(ffvb.read(SOURCE)).thenReturn(resource);
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    CollectionBackend.Target target = target(CollectionTargetKindEnum.CALENDAR);
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(target), 0, false));
    List<SportingObservation.Match> matches =
        IntStream.rangeClosed(1, 100)
            .mapToObj(
                index ->
                    new SportingObservation.Match(
                        "M" + index,
                        new SportingObservation.Team("Home " + index, null, "000001", null),
                        new SportingObservation.Team("Away " + index, null, "000002", null),
                        SportingObservation.Facts.builder().build(),
                        null))
            .toList();
    List<SportingObservation.Outcome> outcomes =
        IntStream.rangeClosed(1, 100)
            .mapToObj(
                index ->
                    new SportingObservation.Outcome(
                        "M" + index,
                        index == 100
                            ? ObservationOutcomeEnum.REJECTED
                            : ObservationOutcomeEnum.ACCEPTED,
                        null,
                        null,
                        null,
                        null))
            .toList();
    when(resource.calendar(target))
        .thenReturn(
            new FfvbAcquisition.Read<>(
                new SportingObservation.Calendar(true, matches, List.of(), List.of()), NOW));
    when(sporting.calendar(eq(POOL), any(), any()))
        .thenReturn(new SportingObservation.CalendarOutcome(outcomes, 99, 0, 0, 1, false));
    when(backend.complete(admitted.getCycle().id(), NOW)).thenReturn(completed(admitted, NOW));

    // When
    passage.execute(admitted);

    // Then
    ArgumentCaptor<CollectionBackend.Result> results =
        ArgumentCaptor.forClass(CollectionBackend.Result.class);
    verify(backend, times(2)).record(eq(admitted.getCycle().id()), results.capture());
    assertThat(results.getAllValues().getLast().outcome()).isEqualTo(CollectionOutcomeEnum.PARTIAL);
    assertThat(results.getAllValues().getLast().obtainedCount()).isEqualTo(99);
    assertThat(results.getAllValues().getLast().rejectedCount()).isEqualTo(1);
  }

  @Test
  @DisplayName("Stops a superseded incarnation before another stage or sporting write")
  void stopsAfterContextRefusal() {
    // Given
    when(ffvb.resourceUrl(any())).thenReturn(SOURCE);
    when(ffvb.read(SOURCE)).thenReturn(resource);
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    CollectionBackend.Target calendar = target(CollectionTargetKindEnum.CALENDAR);
    CollectionBackend.Target standings = target(CollectionTargetKindEnum.STANDINGS);
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(calendar, standings), 0, false));
    when(resource.calendar(calendar))
        .thenReturn(
            new FfvbAcquisition.Read<>(
                new SportingObservation.Calendar(true, List.of(), List.of(), List.of()), NOW));
    doThrow(new CollectionBackendFailure(CollectionBackendFailure.Kind.CONFLICT, null))
        .when(backend)
        .record(eq(admitted.getCycle().id()), any());
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(2, UUID.randomUUID()));

    // When
    boolean completed = passage.execute(admitted);

    // Then
    assertThat(completed).isFalse();
    verifyNoInteractions(sporting);
    verify(resource, never()).standings(any());
    verify(backend, never()).complete(any(), any());
    assertThatThrownBy(admitted::nextReadOrdinal).isInstanceOf(IllegalStateException.class);
  }

  @Test
  @DisplayName("Retains only safe exception information when acquisition unexpectedly fails")
  void excludesUnsafeFailureMessage(CapturedOutput output) {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    CollectionBackend.Target target = target(CollectionTargetKindEnum.CALENDAR);
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(target), 0, false));
    when(ffvb.resourceUrl(target)).thenReturn(SOURCE);
    when(ffvb.read(SOURCE)).thenThrow(new IllegalStateException("PRIVATE_PROVIDER_PAYLOAD"));
    when(backend.complete(admitted.getCycle().id(), NOW)).thenReturn(completed(admitted, NOW));

    // When
    boolean finished = passage.execute(admitted);

    // Then
    assertThat(finished).isTrue();
    ArgumentCaptor<CollectionBackend.Result> result =
        ArgumentCaptor.forClass(CollectionBackend.Result.class);
    verify(backend).record(eq(admitted.getCycle().id()), result.capture());
    assertThat(result.getValue().reason()).isEqualTo("IllegalStateException");
    assertThat(result.getValue().outcome()).isEqualTo(CollectionOutcomeEnum.FAILED);
    assertThat(output).doesNotContain("PRIVATE_PROVIDER_PAYLOAD");
    verifyNoInteractions(sporting);
  }

  @Test
  @DisplayName("Stops before another shared-resource stage when the lifecycle becomes inactive")
  void stopsBetweenSharedStages() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    CollectionBackend.Target calendar = target(CollectionTargetKindEnum.CALENDAR);
    CollectionBackend.Target standings = target(CollectionTargetKindEnum.STANDINGS);
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(calendar, standings), 0, false));
    when(ffvb.resourceUrl(any())).thenReturn(SOURCE);
    when(ffvb.read(SOURCE)).thenReturn(resource);
    when(resource.calendar(calendar))
        .thenReturn(
            new FfvbAcquisition.Read<>(
                new SportingObservation.Calendar(true, List.of(), List.of(), List.of()), NOW));
    when(sporting.calendar(eq(POOL), any(), any()))
        .thenAnswer(
            call -> {
              lifecycle.stop();
              return new SportingObservation.CalendarOutcome(List.of(), 0, 0, 0, 0, true);
            });

    // When / Then
    assertThatThrownBy(() -> passage.execute(admitted)).isInstanceOf(IllegalStateException.class);
    verify(resource, never()).standings(any());
    verify(backend, never()).complete(any(), any());
  }

  @Test
  @DisplayName("An empty target selection creates no observation or recovery evidence")
  void leavesEmptySelectionUnobserved() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(), 0, false));
    when(backend.complete(admitted.getCycle().id(), NOW)).thenReturn(completed(admitted, NOW));

    // When
    passage.execute(admitted);

    // Then
    verifyNoInteractions(ffvb, sporting);
    verify(backend, never()).record(any(), any());
    verify(backend).complete(admitted.getCycle().id(), NOW);
  }

  @Test
  @DisplayName("Confirms an uncertain completion by one read of the original cycle")
  void confirmsCompletionOnce() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    when(backend.complete(admitted.getCycle().id(), NOW)).thenThrow(uncertain());
    when(backend.cycle(admitted.getCycle().id())).thenReturn(completed(admitted, NOW));

    // When
    boolean confirmed = lifecycle.complete(admitted, NOW);

    // Then
    assertThat(confirmed).isTrue();
    verify(backend).complete(admitted.getCycle().id(), NOW);
    verify(backend).cycle(admitted.getCycle().id());
  }

  @Test
  @DisplayName("Confirms nanosecond clock completion at the persisted microsecond precision")
  void confirmsPersistedPrecision() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    Instant actualEnd = NOW.plusNanos(123_456_789);
    Instant persistedEnd = NOW.plusNanos(123_456_000);
    when(backend.complete(admitted.getCycle().id(), persistedEnd))
        .thenReturn(completed(admitted, persistedEnd));

    // When
    boolean confirmed = lifecycle.complete(admitted, actualEnd);

    // Then
    assertThat(confirmed).isTrue();
    verify(backend).complete(admitted.getCycle().id(), persistedEnd);
    verify(backend, never()).cycle(any());
  }

  @Test
  @DisplayName("Leaves an unconfirmed completion blocked after a single confirmation read")
  void leavesUnconfirmedCompletionBlocked() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    when(backend.complete(admitted.getCycle().id(), NOW)).thenThrow(uncertain());
    when(backend.cycle(admitted.getCycle().id())).thenReturn(admitted.getCycle());

    // When
    boolean confirmed = lifecycle.complete(admitted, NOW);

    // Then
    assertThat(confirmed).isFalse();
    verify(backend).complete(admitted.getCycle().id(), NOW);
    verify(backend).cycle(admitted.getCycle().id());
  }

  @Test
  @DisplayName("Confirms atomic candidate completion without substituting a control completion")
  void confirmsCandidateResultOnce() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(true);
    CollectionBackend.Validation result =
        new CollectionBackend.Validation(
            admitted.getCycle().id(), SourceValidationStateEnum.QUALIFIED, NOW, "2026/2027", null);
    doThrow(uncertain()).when(backend).validate(CONTROL, result);
    when(backend.cycle(admitted.getCycle().id()))
        .thenReturn(completed(admitted, NOW.plusSeconds(1)));

    // When
    boolean confirmed = lifecycle.validate(admitted, result);

    // Then
    assertThat(confirmed).isTrue();
    verify(backend).validate(CONTROL, result);
    verify(backend).cycle(admitted.getCycle().id());
    verify(backend, never()).complete(any(), any());
  }

  /**
   * Creates a capability through real startup and admission decisions.
   *
   * @param candidate selects the actual conditional admission purpose
   * @return a real lifecycle-issued capability
   */
  private CollectorLifecycle.AdmittedCycle admit(boolean candidate) {
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    when(backend.admit(any()))
        .thenAnswer(
            call -> {
              CollectionBackend.StartCycle command = call.getArgument(0);
              return new CollectionBackend.Cycle(
                  command.cycleId(),
                  command.incarnationId(),
                  command.controlId(),
                  command.sourceBindingId(),
                  1,
                  candidate ? null : CollectionModeEnum.PERIODIC,
                  CollectionCycleStateEnum.RUNNING,
                  candidate,
                  null);
            });
    return lifecycle.admit(candidate ? null : CONTROL, candidate ? CONTROL : null, 0, null);
  }

  /**
   * Returns the original context with the exact terminal timestamp.
   *
   * @param admitted original capability
   * @param completedAt accepted backend terminal time
   * @return the same context with its actual accepted completion
   */
  private CollectionBackend.Cycle completed(
      CollectorLifecycle.AdmittedCycle admitted, Instant completedAt) {
    CollectionBackend.Cycle cycle = admitted.getCycle();
    return new CollectionBackend.Cycle(
        cycle.id(),
        cycle.incarnationId(),
        cycle.controlId(),
        cycle.sourceBindingId(),
        cycle.cycleOrder(),
        cycle.mode(),
        CollectionCycleStateEnum.COMPLETED,
        cycle.hasCandidate(),
        completedAt);
  }

  /**
   * Supplies a synthetic selected pool for one stage.
   *
   * @param kind independently selected stage
   * @return synthetic admitted pool context
   */
  private CollectionBackend.Target target(CollectionTargetKindEnum kind) {
    return CollectionBackend.Target.builder()
        .url(SOURCE)
        .scopeId(POOL)
        .poolId(POOL)
        .provider(CollectionProviderEnum.FFVB)
        .kind(kind)
        .build();
  }

  /**
   * Models response loss without a network side effect.
   *
   * @return a response-loss classification without a real network side effect
   */
  private CollectionBackendFailure uncertain() {
    return new CollectionBackendFailure(
        CollectionBackendFailure.Kind.UNCONFIRMED, new IOException("Synthetic response loss"));
  }
}
