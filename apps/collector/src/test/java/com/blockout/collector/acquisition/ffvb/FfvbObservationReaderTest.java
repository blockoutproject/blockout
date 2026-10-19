package com.blockout.collector.acquisition.ffvb;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.acquisition.application.FfvbAcquisition;
import com.blockout.collector.acquisition.application.FfvbAcquisitionException;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.config.AcquisitionConfiguration;
import com.blockout.collector.config.AcquisitionProperties;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

/** Actual bounded HTTP reads and parsers against an isolated synthetic FFVB peer. */
@DisplayName("Passage-owned FFVB shared resources")
class FfvbObservationReaderTest {
  private static final Instant HTML_TIME = Instant.parse("2026-10-19T12:00:00Z");
  private static final Instant EXPORT_TIME = HTML_TIME.plusSeconds(1);
  private final Clock clock = mock(Clock.class);
  private final AtomicInteger htmlReads = new AtomicInteger();
  private final AtomicInteger exportReads = new AtomicInteger();
  private HttpServer server;
  private ProviderHttpClient http;
  private FfvbObservationReader reader;
  private URI url;
  private String html;
  private String csv;
  private int exportStatus = 200;

  /** Serves bounded synthetic documents through the production provider transport. */
  @BeforeEach
  void startPeer() throws IOException {
    html =
        new ClassPathResource("acquisition/ffvb/calendar.html")
            .getContentAsString(StandardCharsets.UTF_8);
    csv =
        new ClassPathResource("acquisition/ffvb/calendar.csv")
            .getContentAsString(StandardCharsets.UTF_8);
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/vbspo_calendrier.php",
        exchange -> {
          htmlReads.incrementAndGet();
          byte[] body = html.getBytes(FfvbPage.CHARSET);
          exchange.sendResponseHeaders(200, body.length);
          try (exchange) {
            exchange.getResponseBody().write(body);
          }
        });
    server.createContext(
        "/vbspo_calendrier_export.php",
        exchange -> {
          exportReads.incrementAndGet();
          exchange.getRequestBody().readAllBytes();
          byte[] body = csv.getBytes(FfvbPage.CHARSET);
          exchange.sendResponseHeaders(exportStatus, body.length);
          try (exchange) {
            exchange.getResponseBody().write(body);
          }
        });
    server.start();
    URI origin = URI.create("http://127.0.0.1:" + server.getAddress().getPort());
    url = origin.resolve("/vbspo_calendrier.php");
    AcquisitionProperties properties =
        new AcquisitionProperties(
            List.of(origin.toString()),
            List.of(origin.toString()),
            List.of(origin.toString()),
            Duration.ofSeconds(3),
            16384,
            0,
            1,
            1,
            20,
            Duration.ofMinutes(1),
            Duration.ZERO,
            List.of());
    http = new AcquisitionConfiguration().ffvbProviderClient(properties);
    reader =
        new FfvbObservationReader(http, new FfvbCalendarParser(), new FfvbStandingsParser(), clock);
  }

  /** Releases the actual worker, HTTP pool and local server after every scenario. */
  @AfterEach
  void stopPeer() throws IOException {
    if (http != null) http.close();
    if (server != null) server.stop(0);
  }

  @Test
  @DisplayName("Reuses one HTML and export for different groups with original read times")
  void sharesGroupedResource() {
    // Given
    html =
        html.substring(0, html.indexOf("<table>"))
                .replace("name=\"cal_codpoule\" value=\"TST\"", "name=\"cal_codpoule\" value=\"\"")
                .replace("name=\"cal_coddiv\" value=\"\"", "name=\"cal_coddiv\" value=\"TEST\"")
                .replace("name=\"cal_codtour\" value=\"\"", "name=\"cal_codtour\" value=\"02\"")
            + "<table><tr><td><input name=poule value=A></td></tr></table>"
            + "<table><tr><td></td><td></td><td>Points</td><td>Jou.</td></tr></table>"
            + "<table><tr><td>Tour 02</td></tr><tr><td>TST001</td><td></td><td></td><td>A</td><td></td><td>B</td></tr></table>"
            + "<table><tr><td><input name=poule value=B></td></tr></table>"
            + "<table><tr><td>Tour 02</td></tr><tr><td>TST002</td><td></td><td></td><td>A</td><td></td><td>xxxxx</td></tr></table></body></html>";
    CollectionBackend.Target first = target("A", "02", "A");
    CollectionBackend.Target second = target("B", "02", "B");
    when(clock.instant()).thenReturn(HTML_TIME, EXPORT_TIME, HTML_TIME.plusSeconds(100));

    // When
    FfvbAcquisition.Resource resource = reader.read(reader.resourceUrl(first));
    FfvbAcquisition.Read<SportingObservation.Calendar> firstCalendar = resource.calendar(first);
    FfvbAcquisition.Read<SportingObservation.Calendar> secondCalendar = resource.calendar(second);
    FfvbAcquisition.Read<SportingObservation.Standings> standings = resource.standings(first);

    // Then
    assertThat(htmlReads).hasValue(1);
    assertThat(exportReads).hasValue(1);
    assertThat(firstCalendar.observation().matches())
        .singleElement()
        .satisfies(match -> assertThat(match.nativeMatchReference()).isEqualTo("TST001"));
    assertThat(secondCalendar.observation().contextSlots())
        .singleElement()
        .satisfies(slot -> assertThat(slot.sourceReference()).isEqualTo("TST002"));
    assertThat(firstCalendar.observedAt()).isEqualTo(EXPORT_TIME);
    assertThat(secondCalendar.observedAt()).isEqualTo(EXPORT_TIME);
    assertThat(standings.observedAt()).isEqualTo(HTML_TIME);
  }

  @Test
  @DisplayName("Keeps standings usable after one refused export without disclosing its body")
  void preservesStandingsAfterExportFailure() {
    // Given
    exportStatus = 400;
    csv = "PRIVATE_PROVIDER_PAYLOAD";
    CollectionBackend.Target target = target("TST", null, null);
    when(clock.instant()).thenReturn(HTML_TIME);
    FfvbAcquisition.Resource resource = reader.read(reader.resourceUrl(target));

    // When / Then
    assertThatThrownBy(() -> resource.calendar(target))
        .isInstanceOf(FfvbAcquisitionException.class)
        .hasMessage("Provider HTTP 400");
    assertThatThrownBy(() -> resource.calendar(target))
        .isInstanceOf(FfvbAcquisitionException.class)
        .hasMessage("Provider HTTP 400");
    assertThat(resource.standings(target).observation().rows()).hasSize(2);
    assertThat(htmlReads).hasValue(1);
    assertThat(exportReads).hasValue(1);
  }

  @Test
  @DisplayName("A later passage reads fresh provider bodies instead of retaining a cache")
  void refreshesNextPassage() {
    // Given
    CollectionBackend.Target target = target("TST", null, null);
    when(clock.instant())
        .thenReturn(HTML_TIME, EXPORT_TIME, HTML_TIME.plusSeconds(60), EXPORT_TIME.plusSeconds(60));
    FfvbAcquisition.Read<SportingObservation.Calendar> first =
        reader.read(reader.resourceUrl(target)).calendar(target);
    csv = csv.replace("Équipe A; espoirs", "Updated team");

    // When
    FfvbAcquisition.Read<SportingObservation.Calendar> next =
        reader.read(reader.resourceUrl(target)).calendar(target);

    // Then
    assertThat(first.observation().matches().getFirst().home().sourceName())
        .isEqualTo("Équipe A; espoirs");
    assertThat(next.observation().matches().getFirst().home().sourceName())
        .isEqualTo("Updated team");
    assertThat(next.observedAt()).isEqualTo(EXPORT_TIME.plusSeconds(60));
    assertThat(htmlReads).hasValue(2);
    assertThat(exportReads).hasValue(2);
  }

  /**
   * Supplies an admitted native scope served by the same synthetic resource.
   *
   * @param pool native pool reference
   * @param tour optional round
   * @param group optional contextual group
   * @return immutable context without an invented match-code partition
   */
  private CollectionBackend.Target target(String pool, String tour, String group) {
    return CollectionBackend.Target.builder()
        .url(url)
        .seasonLabel("2026/2027")
        .organizerReference("ABCCS")
        .competitionReference("TEST")
        .poolReference(pool)
        .tourReference(tour)
        .groupReference(group)
        .build();
  }
}
