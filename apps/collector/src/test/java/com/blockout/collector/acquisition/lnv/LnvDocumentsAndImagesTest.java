package com.blockout.collector.acquisition.lnv;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import com.blockout.collector.config.AcquisitionConfiguration;
import com.blockout.collector.config.AcquisitionProperties;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Native bounded HTTP caching against an isolated origin; no live image or document is fetched. */
@DisplayName("LNV auxiliary documents and native image caching")
class LnvDocumentsAndImagesTest {
  @ParameterizedTest
  @ValueSource(ints = {200, 304})
  @DisplayName("Revalidation distinguishes a changed image body from cached 304 reuse")
  void distinguishesRevalidation(int status) throws Exception {
    // Given
    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    AtomicInteger reads = new AtomicInteger();
    server.createContext(
        "/logo",
        exchange -> {
          int count = reads.incrementAndGet();
          exchange.getResponseHeaders().add("Cache-Control", "public, max-age=0");
          exchange
              .getResponseHeaders()
              .add("ETag", count == 1 || status == 304 ? "\"v1\"" : "\"v2\"");
          exchange.getResponseHeaders().add("Content-Type", "image/jpeg");
          int response = count == 1 ? 200 : status;
          exchange.sendResponseHeaders(response, response == 304 ? -1 : 1);
          if (response != 304) exchange.getResponseBody().write(count);
          exchange.close();
        });
    server.start();
    URI origin = URI.create("http://127.0.0.1:" + server.getAddress().getPort());
    AcquisitionProperties properties =
        new AcquisitionProperties(
            List.of(origin.toString()),
            List.of(origin.toString()),
            List.of(origin.toString()),
            Duration.ofSeconds(3),
            1024,
            1,
            1,
            1,
            10,
            Duration.ofSeconds(1),
            Duration.ZERO,
            List.of());
    try (ProviderHttpClient http = new AcquisitionConfiguration().lnvProviderClient(properties)) {
      http.image(origin.resolve("/logo")).join();

      // When
      ProviderHttpClient.Response result = http.image(origin.resolve("/logo")).join();

      // Then
      assertThat(reads).hasValue(2);
      assertThat(result.supplierRead()).isEqualTo(status == 200);
      assertThat(result.body()).containsExactly(status == 200 ? 2 : 1);
    } finally {
      server.stop(0);
    }
  }

  @Test
  @DisplayName("The actual tab order and hidden state determine the document form request")
  void resolvesPublishedDocumentForm() {
    // Given
    URI page = URI.create("https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=990&ID=901");
    String html =
        """
        <form method=post action="MatchStatistics.aspx?mID=990&ID=901">
        <input type=hidden name=__VIEWSTATE value=synthetic-state>
        <input type=hidden name=__EVENTVALIDATION value=synthetic-validation>
        <div id=NativeTabs><ul><li class=rtsLI>Scoresheet</li><li class=rtsLI>Statistics</li><li class=rtsLI>DataVolley</li></ul></div>
        <input type=hidden id=NativeTabs_State name=Native$Tabs$State value='{"selectedIndexes":["1"]}'>
        </form><script>
        $create(Telerik.Web.UI.RadTabStrip, {"_postBackReference":"__doPostBack('actual$Control','arguments')","clientStateFieldID":"NativeTabs_State","tabData":[{"value":"sheet"},{"value":"stats"},{"value":"volley"}]}, null, null, $get("NativeTabs"));
        </script>
        """;

    // When
    LnvDocumentReferences.Form form =
        new LnvDocumentReferences().form(html.getBytes(StandardCharsets.UTF_8), page, "Scoresheet");

    // Then
    assertThat(form.action()).isEqualTo(page);
    assertThat(
            form.fields().stream()
                .filter(field -> field.getName().equals("Native$Tabs$State"))
                .toList())
        .singleElement()
        .satisfies(field -> assertThat(field.getValue()).contains("\"selectedIndexes\":[\"0\"]"));
    assertThat(form.fields())
        .anySatisfy(
            field -> {
              assertThat(field.getName()).isEqualTo("__EVENTTARGET");
              assertThat(field.getValue()).isEqualTo("actual$Control");
            });
    assertThat(form.fields())
        .anySatisfy(
            field -> {
              assertThat(field.getName()).isEqualTo("__EVENTARGUMENT");
              assertThat(field.getValue()).contains("\"index\":\"0\"");
            });
    assertThat(form.fields())
        .anySatisfy(
            field -> {
              assertThat(field.getName()).isEqualTo("__VIEWSTATE");
              assertThat(field.getValue()).isEqualTo("synthetic-state");
            });
    assertThat(
            new LnvDocumentReferences()
                .publishedPdf(
                    "<iframe src='https://documents.example.invalid/qualified.pdf'></iframe>"
                        .getBytes(StandardCharsets.UTF_8),
                    page))
        .isEqualTo(URI.create("https://documents.example.invalid/qualified.pdf"));
  }

  @Test
  @DisplayName("Only exact verified season/championship/team associations supply an auxiliary code")
  void qualifiesOnlyDocumentCode() {
    // Given
    List<AcquisitionProperties.DocumentTeamAssociation> associations =
        List.of(
            new AcquisitionProperties.DocumentTeamAssociation(2026, "901", "001", "HOME XML"),
            new AcquisitionProperties.DocumentTeamAssociation(2026, "901", "002", "AWAY XML"));
    String xml =
        """
        <Calendrier><Competition CodeCompetition="LAM"><Journee><Match>
        <CodeMatch>00AA</CodeMatch><EquipeDomicile>HOME XML</EquipeDomicile>
        <EquipeExterieur>AWAY XML</EquipeExterieur><Date>17-10-2026</Date>
        <Score>0-3</Score></Match></Journee></Competition></Calendrier>
        """;
    LnvDocumentReferences documents = new LnvDocumentReferences();
    SportingObservation.InformationSheet sheet =
        documents.informationSheet(
            xml.getBytes(StandardCharsets.UTF_8),
            2026,
            "901",
            "LAM",
            "001",
            "002",
            LocalDate.of(2026, 10, 17),
            associations);
    assertThat(sheet.matchCode()).isEqualTo("00AA");
    assertThat(sheet.organizerReference()).isEqualTo("AALNV");
    assertThat(
            documents.informationSheet(
                xml.getBytes(StandardCharsets.UTF_8),
                2025,
                "901",
                "LAM",
                "001",
                "002",
                LocalDate.of(2025, 10, 17),
                associations))
        .isNull();
    assertThat(
            documents.informationSheet(
                xml.replace(
                        "</Journee>",
                        xml.substring(xml.indexOf("<Match>"), xml.indexOf("</Match>") + 8)
                            + "</Journee>")
                    .getBytes(StandardCharsets.UTF_8),
                2026,
                "901",
                "LAM",
                "001",
                "002",
                LocalDate.of(2026, 10, 17),
                associations))
        .isNull();
  }

  @Test
  @DisplayName("Origin-authorized cached image reuse is not a new supplier observation")
  void reusesImageWithoutFreshness() throws Exception {
    // Given
    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    AtomicInteger reads = new AtomicInteger();
    server.createContext(
        "/logo",
        exchange -> {
          reads.incrementAndGet();
          exchange.getResponseHeaders().add("Cache-Control", "public, max-age=7200");
          exchange.getResponseHeaders().add("Content-Type", "image/jpeg");
          exchange.sendResponseHeaders(200, 3);
          exchange.getResponseBody().write(new byte[] {1, 2, 3});
          exchange.close();
        });
    server.start();
    URI origin = URI.create("http://127.0.0.1:" + server.getAddress().getPort());
    AcquisitionProperties properties =
        new AcquisitionProperties(
            List.of(origin.toString()),
            List.of(origin.toString()),
            List.of(origin.toString()),
            Duration.ofSeconds(3),
            1024,
            1,
            1,
            1,
            10,
            Duration.ofSeconds(1),
            Duration.ZERO,
            List.of());
    try (ProviderHttpClient http = new AcquisitionConfiguration().lnvProviderClient(properties)) {
      // When
      ProviderHttpClient.Response first = http.image(origin.resolve("/logo")).join();
      ProviderHttpClient.Response second = http.image(origin.resolve("/logo")).join();
      // Then
      assertThat(first.supplierRead()).isTrue();
      assertThat(second.supplierRead()).isFalse();
      assertThat(second.body()).containsExactly(1, 2, 3);
      assertThat(reads).hasValue(1);
    } finally {
      server.stop(0);
    }
  }

  @Test
  @DisplayName("Ordinary pages are never cached and pin the explicit offset-zero convention")
  void readsPagesWithoutCache() throws Exception {
    // Given
    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    AtomicInteger reads = new AtomicInteger();
    server.createContext(
        "/page",
        exchange -> {
          assertThat(exchange.getRequestHeaders().getFirst("Cookie")).isEqualTo("timezoneoffset=0");
          reads.incrementAndGet();
          exchange.getResponseHeaders().add("Cache-Control", "public, max-age=7200");
          exchange.sendResponseHeaders(200, 2);
          exchange.getResponseBody().write(new byte[] {1, 2});
          exchange.close();
        });
    server.start();
    URI origin = URI.create("http://127.0.0.1:" + server.getAddress().getPort());
    AcquisitionProperties properties =
        new AcquisitionProperties(
            List.of(origin.toString()),
            List.of(origin.toString()),
            List.of(origin.toString()),
            Duration.ofSeconds(3),
            1024,
            1,
            1,
            1,
            10,
            Duration.ofSeconds(1),
            Duration.ZERO,
            List.of());
    try (ProviderHttpClient http = new AcquisitionConfiguration().lnvProviderClient(properties)) {
      // When
      http.page(origin.resolve("/page")).join();
      http.page(origin.resolve("/page")).join();
      // Then
      assertThat(reads).hasValue(2);
    } finally {
      server.stop(0);
    }
  }
}
