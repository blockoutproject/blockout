package com.blockout.collector.acquisition.lnv;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
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
    LnvAcquisition.DocumentIndexes indexes = reader.documentIndexes();

    // When
    LnvAcquisition.Read<Map<String, SportingObservation.InformationSheet>> firstRead =
        indexes.informationSheets(first, calendar);
    LnvAcquisition.Read<Map<String, SportingObservation.InformationSheet>> secondRead =
        indexes.informationSheets(second, calendar);

    // Then
    verify(http).page(indexUrl);
    assertThat(firstRead.observation().get("990").matchCode()).isEqualTo("00AA");
    assertThat(secondRead.observation()).isEqualTo(firstRead.observation());
    assertThat(secondRead.observedAt()).isEqualTo(firstTime);
  }
}
