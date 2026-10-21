package com.blockout.collector.acquisition.lnv;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.acquisition.application.LnvAcquisition;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.config.AcquisitionProperties;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * Exercises the real document-index adapter with a controlled transport and verified associations.
 */
@DisplayName("Passage-local LNV auxiliary index reads")
class LnvObservationReaderTest {
  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(
      strings = {"mID=991&ID=901", "mID=990&ID=999", "mID=990&ID=901&PID=999"})
  @DisplayName("A redirected detail context cannot submit a document form for the admitted match")
  void rejectsForeignDocumentContext(String query) {
    // Given
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    LnvObservationReader reader = documentReader(http);
    CollectionBackend.Target target =
        CollectionBackend.Target.builder()
            .nativeMatchReference("990")
            .competitionReference("901")
            .poolReference("902")
            .build();
    LnvAcquisition.Resource resource =
        reader.fromPage(
            new ProviderHttpClient.Response(
                new byte[0],
                URI.create("https://lnv-web.dataproject.com/MatchStatistics.aspx?" + query),
                true),
            Instant.EPOCH);

    // When / Then
    assertThatThrownBy(() -> resource.document(target, "Scoresheet"))
        .isInstanceOf(LnvAcquisitionException.class);
    verifyNoInteractions(http);
  }

  @Test
  @DisplayName(
      "Positive contradictory season evidence prevents both detail and document interpretation")
  void rejectsContradictoryDetailSeason() {
    // Given
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    LnvObservationReader reader = documentReader(http);
    CollectionBackend.Target target =
        CollectionBackend.Target.builder()
            .seasonLabel("2026/2027")
            .nativeMatchReference("990")
            .competitionReference("901")
            .build();
    URI page = URI.create("https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=990&ID=901");
    String html =
        "<title>Alterna VOLSTAR 2027/2028</title><span id=Content_Main_LB_DateTime>dimanche 17 octobre 2027</span><span id=Content_Main_LBL_WonSetHome>3</span><span id=Content_Main_LBL_WonSetGuest>1</span>";
    LnvAcquisition.Resource resource =
        reader.fromPage(
            new ProviderHttpClient.Response(html.getBytes(StandardCharsets.UTF_8), page, true),
            Instant.EPOCH);

    // When / Then
    assertThatThrownBy(() -> resource.detail(target)).isInstanceOf(LnvAcquisitionException.class);
    assertThatThrownBy(() -> resource.document(target, "Scoresheet"))
        .isInstanceOf(LnvAcquisitionException.class);
    verifyNoInteractions(http);
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(booleans = {false, true})
  @DisplayName(
      "Document form responses preserve admitted identity and season before returning a PDF link")
  void rejectsForeignDocumentResponse(boolean wrongSeason) {
    // Given
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    LnvObservationReader reader = documentReader(http);
    URI page = URI.create("https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=990&ID=901");
    String html =
        """
        <form method=post><input type=hidden id=State name=State value='{}'>
        <div id=Tabs><li class=rtsLI>Scoresheet</li></div></form><script>
        $create(Telerik.Web.UI.RadTabStrip, {"_postBackReference":"__doPostBack('tabs','arguments')","clientStateFieldID":"State","tabData":[{}]}, null, null, $get("Tabs"));
        </script>
        """;
    CollectionBackend.Target target =
        CollectionBackend.Target.builder()
            .seasonLabel("2026/2027")
            .nativeMatchReference("990")
            .competitionReference("901")
            .build();
    LnvAcquisition.Resource resource =
        reader.fromPage(
            new ProviderHttpClient.Response(html.getBytes(StandardCharsets.UTF_8), page, true),
            Instant.EPOCH);
    when(http.postPage(any(), any()))
        .thenReturn(
            CompletableFuture.completedFuture(
                new ProviderHttpClient.Response(
                    ("<title>Alterna VOLSTAR "
                            + (wrongSeason ? "2027/2028" : "2026/2027")
                            + "</title><iframe src='https://documents.example.invalid/foreign.pdf'></iframe>")
                        .getBytes(StandardCharsets.UTF_8),
                    URI.create(
                        "https://lnv-web.dataproject.com/MatchStatistics.aspx?mID="
                            + (wrongSeason ? "990" : "991")
                            + "&ID=901"),
                    true)));

    // When / Then
    assertThatThrownBy(() -> resource.document(target, "Scoresheet"))
        .isInstanceOf(LnvAcquisitionException.class);
    verify(http).postPage(any(), any());
    org.mockito.Mockito.verifyNoMoreInteractions(http);
  }

  @Test
  @DisplayName("A published championship table without PID uses its explicit group container")
  void readsChampionshipTable() {
    // Given
    LnvObservationReader reader = documentReader(mock(ProviderHttpClient.class));
    URI page = URI.create("https://lnv-web.dataproject.com/CompetitionStandings.aspx?ID=901");
    String html =
        "<div id=Content_Main_903><table class=rgMasterTable><thead><tr><th>Equipe</th><th>Points</th></tr></thead><tbody><tr><td><span id=TeamName>Home</span><input id=HF_TeamID value=001></td><td>9</td></tr></tbody></table></div>";
    LnvAcquisition.Resource resource =
        reader.fromPage(
            new ProviderHttpClient.Response(html.getBytes(StandardCharsets.UTF_8), page, true),
            Instant.EPOCH);
    CollectionBackend.Target target =
        CollectionBackend.Target.builder()
            .competitionReference("901")
            .poolReference("902")
            .groupReference("903")
            .build();

    // When
    LnvAcquisition.Read<SportingObservation.Standings> read = resource.standings(target);

    // Then
    assertThat(read.observation().rows())
        .singleElement()
        .satisfies(row -> assertThat(row.nativeTeamReference()).isEqualTo("001"));
  }

  @Test
  @DisplayName("An invalid detail schedule yields partial evidence with usable result facts")
  void reportsPartialDetail() {
    // Given
    LnvObservationReader reader = documentReader(mock(ProviderHttpClient.class));
    URI page = URI.create("https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=990&ID=901");
    String html =
        "<span id=Content_Main_LB_DateTime>invalid date</span><span id=Content_Main_LBL_WonSetHome>3</span><span id=Content_Main_LBL_WonSetGuest>1</span>";
    LnvAcquisition.Resource resource =
        reader.fromPage(
            new ProviderHttpClient.Response(html.getBytes(StandardCharsets.UTF_8), page, true),
            Instant.EPOCH);
    CollectionBackend.Target target =
        CollectionBackend.Target.builder()
            .nativeMatchReference("990")
            .competitionReference("901")
            .build();

    // When
    LnvAcquisition.Read<SportingObservation.Facts> read = resource.detail(target);

    // Then
    assertThat(read.complete()).isFalse();
    assertThat(read.observation().result().get().homeSets()).isEqualTo(3);
    assertThat(read.observation().localDate()).isNull();
  }

  @Test
  @DisplayName("Two admitted pools share one XML read and its original completion time")
  void sharesIndexAcrossPools() {
    // Given
    URI indexUrl = URI.create("https://www.lnv.fr/xml/calendrier-LAM.xml");
    String xml =
        """
        <Calendrier><Competition CodeCompetition="LAM"><Journee><Match>
        <CodeMatch>00AA</CodeMatch><EquipeDomicile>HOME XML</EquipeDomicile>
        <EquipeExterieur>AWAY XML</EquipeExterieur><Date>17-10-2026</Date>
        </Match></Journee></Competition></Calendrier>
        """;
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    when(http.page(indexUrl))
        .thenReturn(
            CompletableFuture.completedFuture(
                new ProviderHttpClient.Response(
                    xml.getBytes(StandardCharsets.UTF_8), indexUrl, true)));
    Instant firstTime = Instant.parse("2026-10-17T12:00:00Z");
    Clock clock = mock(Clock.class);
    when(clock.instant()).thenReturn(firstTime, firstTime.plusSeconds(60));
    AcquisitionProperties properties =
        new AcquisitionProperties(
            List.of(),
            List.of(),
            List.of(),
            Duration.ofSeconds(3),
            1024,
            1,
            1,
            1,
            10,
            Duration.ofSeconds(1),
            Duration.ZERO,
            List.of(
                new AcquisitionProperties.DocumentTeamAssociation(2026, "901", "001", "HOME XML"),
                new AcquisitionProperties.DocumentTeamAssociation(2026, "901", "002", "AWAY XML")));
    LnvObservationReader reader =
        new LnvObservationReader(
            http,
            new LnvCalendarParser(),
            new LnvStandingsParser(),
            new LnvDetailParser(),
            new LnvTeamImages(http, clock),
            new LnvDocumentReferences(),
            properties,
            clock);
    CollectionBackend.Target first =
        CollectionBackend.Target.builder()
            .seasonLabel("2026/2027")
            .competitionReference("901")
            .poolReference("902")
            .build();
    CollectionBackend.Target second = first.toBuilder().poolReference("904").build();
    SportingObservation.Calendar matches =
        new SportingObservation.Calendar(
            true,
            List.of(
                new SportingObservation.Match(
                    "990",
                    new SportingObservation.Team("Home", "001", null, null),
                    new SportingObservation.Team("Away", "002", null, null),
                    SportingObservation.Facts.builder()
                        .localDate(JsonNullable.of(LocalDate.of(2026, 10, 17)))
                        .build(),
                    null)),
            List.of(),
            List.of());
    LnvAcquisition.Calendar calendar =
        new LnvAcquisition.Calendar(matches, Map.of(), firstTime, "LAM");
    LnvAcquisition.DocumentIndexes indexes = reader.documentIndexes(() -> 7);

    // When
    LnvAcquisition.DocumentRead firstRead = indexes.informationSheets(first, calendar);
    LnvAcquisition.DocumentRead secondRead = indexes.informationSheets(second, calendar);

    // Then
    verify(http).page(indexUrl);
    assertThat(firstRead.observation().get("990").matchCode()).isEqualTo("00AA");
    assertThat(secondRead.observation()).isEqualTo(firstRead.observation());
    assertThat(secondRead.observedAt()).isEqualTo(firstTime);
    assertThat(secondRead.readOrdinal()).isEqualTo(7);
  }

  /**
   * Composes real native parsers with only the transport controlled and no XML associations.
   *
   * @param http controlled provider boundary
   * @return reader with a deterministic source completion clock
   */
  private LnvObservationReader documentReader(ProviderHttpClient http) {
    Clock clock = Clock.fixed(Instant.EPOCH, java.time.ZoneOffset.UTC);
    AcquisitionProperties properties =
        new AcquisitionProperties(
            List.of(),
            List.of(),
            List.of(),
            Duration.ofSeconds(3),
            1024,
            1,
            1,
            1,
            10,
            Duration.ofSeconds(1),
            Duration.ZERO,
            List.of());
    return new LnvObservationReader(
        http,
        new LnvCalendarParser(),
        new LnvStandingsParser(),
        new LnvDetailParser(),
        new LnvTeamImages(http, clock),
        new LnvDocumentReferences(),
        properties,
        clock);
  }
}
