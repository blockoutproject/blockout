package com.blockout.collector.acquisition.lnv;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.acquisition.application.LnvAcquisition;
import com.blockout.collector.acquisition.application.ProviderResponse;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.config.AcquisitionProperties;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicInteger;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.core.task.TaskRejectedException;

/**
 * Exercises real LNV observation and document-index adaptation with controlled transport and
 * verified associations.
 */
@DisplayName("LNV source observations and passage-local auxiliary indexes")
class LnvObservationReaderTest {
  @Test
  @DisplayName("A new supplier image body retains its actual observation time")
  void observesSupplierImage() {
    // Given
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    URI image = URI.create("https://images.dataproject.com/lnv/TeamLogo/team.png");
    when(http.image(image))
        .thenReturn(
            CompletableFuture.completedFuture(
                new ProviderResponse(new byte[] {1, 2, 3}, image, true)));
    LnvObservationReader reader = documentReader(http);

    // When
    LnvAcquisition.Read<byte[]> read = reader.image(image);

    // Then
    assertThat(read.observation()).containsExactly(1, 2, 3);
    assertThat(read.observedAt()).isEqualTo(Instant.EPOCH);
    verify(http).image(image);
    verifyNoMoreInteractions(http);
  }

  @Test
  @DisplayName("A reused image body does not create a supplier observation")
  void omitsCachedImageObservation() {
    // Given
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    URI image = URI.create("https://images.dataproject.com/lnv/TeamLogo/team.png");
    when(http.image(image))
        .thenReturn(
            CompletableFuture.completedFuture(
                new ProviderResponse(new byte[] {1, 2, 3}, image, false)));
    LnvObservationReader reader = documentReader(http);

    // When
    LnvAcquisition.Read<byte[]> read = reader.image(image);

    // Then
    assertThat(read).isNull();
    verify(http).image(image);
    verifyNoMoreInteractions(http);
  }

  @Test
  @DisplayName("Calendar document qualification uses the admitted group's published title")
  void usesQualifiedCalendarTitle() {
    // Given
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    LnvObservationReader reader = documentReader(http);
    URI page = URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=902");
    String html =
        """
        <div id=Content_Main_903>
          <span id=group_lbl_title>Alterna VOLSTAR</span><p>Aucun match</p>
        </div>
        <div id=Content_Main_904><span id=other_lbl_title>Saforelle VOLSTAR</span></div>
        """;
    LnvAcquisition.Resource resource =
        reader.fromPage(
            new ProviderResponse(html.getBytes(StandardCharsets.UTF_8), page, true), Instant.EPOCH);
    CollectionBackend.Target target =
        CollectionBackend.Target.builder()
            .competitionReference("901")
            .poolReference("902")
            .groupReference("903")
            .build();

    // When
    LnvAcquisition.Calendar calendar = resource.calendar(target);

    // Then
    assertThat(calendar.documentCompetition()).isEqualTo("LAM");
    assertThat(calendar.observation().complete()).isTrue();
    assertThat(calendar.observation().matches()).isEmpty();
    verifyNoInteractions(http);
  }

  @ParameterizedTest
  @ValueSource(strings = {"mID=991&ID=901", "mID=990&ID=999", "mID=990&ID=901&PID=999"})
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
            new ProviderResponse(
                new byte[0],
                URI.create("https://lnv-web.dataproject.com/MatchStatistics.aspx?" + query),
                true),
            Instant.EPOCH);

    // When
    ThrowingCallable action = () -> resource.document(target, "Scoresheet");

    // Then
    assertThatThrownBy(action).isInstanceOf(LnvAcquisitionException.class);
    verifyNoInteractions(http);
  }

  @Test
  @DisplayName(
      "Refuses detail interpretation when the published season contradicts the admitted season")
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
            new ProviderResponse(html.getBytes(StandardCharsets.UTF_8), page, true), Instant.EPOCH);

    // When
    ThrowingCallable action = () -> resource.detail(target);

    // Then
    assertThatThrownBy(action).isInstanceOf(LnvAcquisitionException.class);
    verifyNoInteractions(http);
  }

  @Test
  @DisplayName(
      "Refuses document lookup when the published detail season contradicts the admitted season")
  void rejectsContradictoryDocumentSeason() {
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
            new ProviderResponse(html.getBytes(StandardCharsets.UTF_8), page, true), Instant.EPOCH);

    // When
    ThrowingCallable action = () -> resource.document(target, "Scoresheet");

    // Then
    assertThatThrownBy(action).isInstanceOf(LnvAcquisitionException.class);
    verifyNoInteractions(http);
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
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
            new ProviderResponse(html.getBytes(StandardCharsets.UTF_8), page, true), Instant.EPOCH);
    when(http.postPage(any(), any()))
        .thenReturn(
            CompletableFuture.completedFuture(
                new ProviderResponse(
                    ("<title>Alterna VOLSTAR "
                            + (wrongSeason ? "2027/2028" : "2026/2027")
                            + "</title><iframe src='https://documents.example.invalid/foreign.pdf'></iframe>")
                        .getBytes(StandardCharsets.UTF_8),
                    URI.create(
                        "https://lnv-web.dataproject.com/MatchStatistics.aspx?mID="
                            + (wrongSeason ? "990" : "991")
                            + "&ID=901"),
                    true)));

    // When
    ThrowingCallable action = () -> resource.document(target, "Scoresheet");

    // Then
    assertThatThrownBy(action).isInstanceOf(LnvAcquisitionException.class);
    verify(http).postPage(any(), any());
    verifyNoMoreInteractions(http);
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
            new ProviderResponse(html.getBytes(StandardCharsets.UTF_8), page, true), Instant.EPOCH);
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
            new ProviderResponse(html.getBytes(StandardCharsets.UTF_8), page, true), Instant.EPOCH);
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
  @DisplayName("Admitted matches and pools share one XML read with its original observation token")
  void sharesIndexAcrossPools() {
    // Given
    URI indexUrl = URI.create("https://www.lnv.fr/xml/calendrier-LAM.xml");
    String xml =
        """
        <Calendrier><Competition CodeCompetition="LAM"><Journee><Match>
        <CodeMatch>00AA</CodeMatch><EquipeDomicile>HOME XML</EquipeDomicile>
        <EquipeExterieur>AWAY XML</EquipeExterieur><Date>17-10-2026</Date>
        </Match><Match>
        <CodeMatch>00AB</CodeMatch><EquipeDomicile>AWAY XML</EquipeDomicile>
        <EquipeExterieur>HOME XML</EquipeExterieur><Date>24-10-2026</Date>
        </Match></Journee></Competition></Calendrier>
        """;
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    when(http.page(indexUrl))
        .thenReturn(
            CompletableFuture.completedFuture(
                new ProviderResponse(xml.getBytes(StandardCharsets.UTF_8), indexUrl, true)));
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
                    null),
                new SportingObservation.Match(
                    "991",
                    new SportingObservation.Team("Away", "002", null, null),
                    new SportingObservation.Team("Home", "001", null, null),
                    SportingObservation.Facts.builder()
                        .localDate(JsonNullable.of(LocalDate.of(2026, 10, 24)))
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
    assertThat(firstRead.observation())
        .containsOnly(
            Map.entry(
                "990", new SportingObservation.InformationSheet("2026/2027", "AALNV", "00AA")),
            Map.entry(
                "991", new SportingObservation.InformationSheet("2026/2027", "AALNV", "00AB")));
    assertThat(secondRead.observation()).isEqualTo(firstRead.observation());
    assertThat(secondRead.observedAt()).isEqualTo(firstTime);
    assertThat(secondRead.readOrdinal()).isEqualTo(7);
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Every pool retains the original XML acquisition failure without another request")
  void retainsFailedIndexForPassage(boolean saturated) {
    // Given
    URI indexUrl = URI.create("https://www.lnv.fr/xml/calendrier-LAM.xml");
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    Exception transportFailure;
    if (saturated) {
      TaskRejectedException rejection = new TaskRejectedException("Synthetic provider saturation");
      transportFailure = rejection;
      when(http.page(indexUrl)).thenThrow(rejection);
    } else {
      transportFailure = new IOException("Synthetic transport failure");
      when(http.page(indexUrl)).thenReturn(CompletableFuture.failedFuture(transportFailure));
    }
    LnvObservationReader reader =
        documentReader(
            http,
            List.of(
                new AcquisitionProperties.DocumentTeamAssociation(2026, "901", "001", "HOME XML")));
    CollectionBackend.Target first =
        CollectionBackend.Target.builder()
            .seasonLabel("2026/2027")
            .competitionReference("901")
            .poolReference("902")
            .build();
    CollectionBackend.Target second = first.toBuilder().poolReference("904").build();
    LnvAcquisition.Calendar calendar =
        new LnvAcquisition.Calendar(
            new SportingObservation.Calendar(true, List.of(), List.of(), List.of()),
            Map.of(),
            Instant.EPOCH,
            "LAM");
    AtomicInteger ordinals = new AtomicInteger();
    LnvAcquisition.DocumentIndexes indexes = reader.documentIndexes(ordinals::incrementAndGet);

    // When
    Throwable firstFailure = catchThrowable(() -> indexes.informationSheets(first, calendar));
    Throwable secondFailure = catchThrowable(() -> indexes.informationSheets(second, calendar));

    // Then
    assertThat(firstFailure).isNotNull();
    assertThat(secondFailure).isNotNull();
    assertThat(NestedExceptionUtils.getMostSpecificCause(firstFailure)).isSameAs(transportFailure);
    assertThat(NestedExceptionUtils.getMostSpecificCause(secondFailure)).isSameAs(transportFailure);
    assertThat(ordinals).hasValue(1);
    verify(http).page(indexUrl);
    verifyNoMoreInteractions(http);
  }

  @Test
  @DisplayName("A later passage can read an index whose previous acquisition failed")
  void readsFailedIndexInNewPassage() {
    // Given
    URI indexUrl = URI.create("https://www.lnv.fr/xml/calendrier-LAM.xml");
    ProviderHttpClient http = mock(ProviderHttpClient.class);
    when(http.page(indexUrl))
        .thenReturn(
            CompletableFuture.failedFuture(new IOException("Synthetic transport failure")),
            CompletableFuture.completedFuture(
                new ProviderResponse(
                    "<Calendrier/>".getBytes(StandardCharsets.UTF_8), indexUrl, true)));
    LnvObservationReader reader =
        documentReader(
            http,
            List.of(
                new AcquisitionProperties.DocumentTeamAssociation(2026, "901", "001", "HOME XML")));
    CollectionBackend.Target target =
        CollectionBackend.Target.builder()
            .seasonLabel("2026/2027")
            .competitionReference("901")
            .poolReference("902")
            .build();
    LnvAcquisition.Calendar calendar =
        new LnvAcquisition.Calendar(
            new SportingObservation.Calendar(true, List.of(), List.of(), List.of()),
            Map.of(),
            Instant.EPOCH,
            "LAM");
    LnvAcquisition.DocumentIndexes firstPassage = reader.documentIndexes(() -> 1);

    // When
    Throwable firstFailure = catchThrowable(() -> firstPassage.informationSheets(target, calendar));
    LnvAcquisition.DocumentRead laterRead =
        reader.documentIndexes(() -> 2).informationSheets(target, calendar);

    // Then
    assertThat(firstFailure).hasRootCauseInstanceOf(IOException.class);
    assertThat(laterRead.observation()).isEmpty();
    assertThat(laterRead.observedAt()).isEqualTo(Instant.EPOCH);
    assertThat(laterRead.readOrdinal()).isEqualTo(2);
    verify(http, times(2)).page(indexUrl);
    verifyNoMoreInteractions(http);
  }

  /**
   * Composes real native parsers with only the transport controlled and no XML associations.
   *
   * @param http controlled provider boundary
   * @return reader with a deterministic source completion clock
   */
  private LnvObservationReader documentReader(ProviderHttpClient http) {
    return documentReader(http, List.of());
  }

  /**
   * Composes real parsers with the scenario's verified document associations and fixed read clock.
   *
   * @param http controlled provider boundary
   * @param associations exact season/championship/team associations allowed by the scenario
   * @return reader with no provider I/O during construction
   */
  private LnvObservationReader documentReader(
      ProviderHttpClient http, List<AcquisitionProperties.DocumentTeamAssociation> associations) {
    Clock clock = Clock.fixed(Instant.EPOCH, ZoneOffset.UTC);
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
            associations);
    return new LnvObservationReader(
        http,
        new LnvCalendarParser(),
        new LnvStandingsParser(),
        new LnvDetailParser(),
        new LnvDocumentReferences(),
        properties,
        clock);
  }
}
