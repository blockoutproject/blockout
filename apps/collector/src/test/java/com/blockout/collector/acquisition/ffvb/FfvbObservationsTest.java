package com.blockout.collector.acquisition.ffvb;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.collector.acquisition.application.FfvbAcquisitionException;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.generated.ingestion.model.ContextSlotKindEnum;
import com.blockout.collector.generated.ingestion.model.StandingsPublicationStateEnum;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Qualifies contextual interpretation using synthetic fixtures and native CSV/HTML parsers. */
@DisplayName("FFVB contextual calendar and official standings interpretation")
class FfvbObservationsTest {
  private static final URI URL =
      URI.create("https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?calend=COMPLET");
  private static final FfvbScope SCOPE =
      new FfvbScope("2026/2027", "ABCCS", "TEST", "TST", null, null);
  private final FfvbCalendarParser calendars = new FfvbCalendarParser();
  private final FfvbStandingsParser standings = new FfvbStandingsParser();

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName(
      "Keeps published round groups independent even when another group's row is malformed")
  void followsPublishedGroups(boolean invalidOtherGroup) throws IOException {
    // Given
    String form =
        fixture("calendar.html")
            .substring(0, fixture("calendar.html").indexOf("<table>"))
            .replace("name=\"cal_codpoule\" value=\"TST\"", "name=\"cal_codpoule\" value=\"\"")
            .replace("name=\"cal_coddiv\" value=\"\"", "name=\"cal_coddiv\" value=\"TEST\"")
            .replace("name=\"cal_codtour\" value=\"\"", "name=\"cal_codtour\" value=\"02\"");
    String html =
        form
            + "<table><tr><td><input name=poule value=GROUP-A></td></tr></table>"
            + "<table><tr><td>Tour 02</td></tr><tr><td>TST002</td><td></td><td></td><td>B</td><td></td><td>xxxxx</td></tr></table>"
            + "<table><tr><td><input name=poule value=GROUP-B></td></tr></table>"
            + "<table><tr><td>Tour 02</td></tr><tr><td>TST001</td><td></td><td></td><td>A</td><td></td><td>B</td></tr></table></body></html>";
    FfvbScope scope = new FfvbScope("2026/2027", "ABCCS", "TEST", "GROUP-A", "02", "GROUP-A");
    String csv = fixture("calendar.csv").replace("ABCCS;02;", "ABCCS;01;");
    if (invalidOtherGroup) {
      String otherRow =
          csv.lines().filter(line -> line.contains(";TST001;")).findFirst().orElseThrow();
      csv = csv.replace(otherRow, "ABCCS;01;TST001;malformed");
    }

    // When
    SportingObservation.Calendar result =
        calendars.parse(bytes(csv), new FfvbPage(bytes(html), URL, scope), scope);

    // Then
    assertThat(result.complete()).isTrue();
    assertThat(result.matches()).isEmpty();
    assertThat(result.contextSlots())
        .singleElement()
        .satisfies(slot -> assertThat(slot.sourceReference()).isEqualTo("TST002"));
  }

  @Test
  @DisplayName("A qualified empty pool differs from unavailable or contradictory content")
  void qualifiesEmptyPool() throws IOException {
    // Given
    String form =
        fixture("calendar.html").substring(0, fixture("calendar.html").indexOf("<table>"));
    String html =
        form
            + "<table><tr><td>TST - Synthetic pool</td></tr><tr><td colspan=11></td></tr></table></body></html>";
    String header = fixture("calendar.csv").lines().findFirst().orElseThrow() + "\n";
    FfvbPage empty = page(html);

    // When
    SportingObservation.Calendar calendar = calendars.parse(bytes(header), empty, SCOPE);
    SportingObservation.Standings table = standings.parse(empty);

    // Then
    assertThat(calendar.complete()).isTrue();
    assertThat(calendar.matches()).isEmpty();
    assertThat(table.publicationState()).isEqualTo(StandingsPublicationStateEnum.NOT_PUBLISHED);
    assertThatThrownBy(() -> calendars.parse(bytes(fixture("calendar.csv")), empty, SCOPE))
        .isInstanceOf(FfvbAcquisitionException.class);
    assertThatThrownBy(() -> page("<html><body>Temporarily unavailable</body></html>"))
        .isInstanceOf(FfvbAcquisitionException.class);
  }

  @Test
  @DisplayName("Refuses a header-only calendar without positive empty-pool evidence")
  void refusesHeaderOnlyCalendar() throws IOException {
    // Given
    String html = fixture("calendar.html");
    String incomplete =
        html.substring(0, html.indexOf("<table>"))
            + "<table><tr><td>Journée 01</td></tr></table></body></html>";
    String header = fixture("calendar.csv").lines().findFirst().orElseThrow() + "\n";

    // When / Then
    assertThatThrownBy(() -> calendars.parse(bytes(header), page(incomplete), SCOPE))
        .isInstanceOf(FfvbAcquisitionException.class);
  }

  @Test
  @DisplayName("Isolates a locally malformed row without discarding an unrelated context slot")
  void isolatesMalformedRow() throws IOException {
    // Given
    String csv = fixture("calendar.csv");
    String first = csv.lines().skip(1).findFirst().orElseThrow();
    csv = csv.replace(first, "ABCCS;01;TST001;unreadable");

    // When
    SportingObservation.Calendar calendar =
        calendars.parse(bytes(csv), page(fixture("calendar.html")), SCOPE);

    // Then
    assertThat(calendar.complete()).isFalse();
    assertThat(calendar.contextSlots()).hasSize(1);
    assertThat(calendar.failures())
        .singleElement()
        .satisfies(failure -> assertThat(failure.sourceReference()).isEqualTo("TST001"));
  }

  @Test
  @DisplayName("Keeps recognized future qualifiers as context instead of inventing a team")
  void preservesFutureQualifier() throws IOException {
    // Given
    String csv = fixture("calendar.csv").replace("xxxxx", "A déterminer");

    // When
    SportingObservation.Calendar result =
        calendars.parse(bytes(csv), page(fixture("calendar.html")), SCOPE);

    // Then
    assertThat(result.matches()).hasSize(1);
    assertThat(result.contextSlots())
        .singleElement()
        .satisfies(
            slot -> assertThat(slot.kind()).isEqualTo(ContextSlotKindEnum.UNDETERMINED_QUALIFIER));
  }

  @Test
  @DisplayName("Preserves Windows-1252 labels, quoted semicolons and leading-zero identifiers")
  void preservesNativeCalendarValues() throws IOException {
    // Given
    FfvbPage page = page(fixture("calendar.html"));

    // When
    SportingObservation.Calendar result =
        calendars.parse(bytes(fixture("calendar.csv")), page, SCOPE);

    // Then
    assertThat(result.complete()).isTrue();
    assertThat(result.matches())
        .singleElement()
        .satisfies(
            match -> {
              assertThat(match.home().sourceName()).isEqualTo("Équipe A; espoirs");
              assertThat(match.home().clubReference()).isEqualTo("0012345");
              assertThat(match.facts().sets().get()).hasSize(3);
            });
    assertThat(result.contextSlots())
        .singleElement()
        .satisfies(slot -> assertThat(slot.kind()).isEqualTo(ContextSlotKindEnum.BYE));
  }

  @ParameterizedTest
  @ValueSource(strings = {"F/P", "3/F", "3/P", "F/F", "2/F"})
  @DisplayName("Preserves synthetic exceptional results without inventing scores or winners")
  void preservesSpecialNotation(String notation) throws IOException {
    // Given
    String csv = fixture("calendar.csv").replace("3/0;25-22,25-18,25-16;75-56", notation + ";;");

    // When
    SportingObservation.Result result =
        calendars
            .parse(bytes(csv), page(fixture("calendar.html")), SCOPE)
            .matches()
            .getFirst()
            .facts()
            .result()
            .get();

    // Then
    assertThat(result.specialLabel()).isEqualTo(notation);
    assertThat(result.homeSets()).isNull();
    assertThat(result.awaySets()).isNull();
  }

  @Test
  @DisplayName("Collapses identical repetitions but isolates conflicting versions")
  void isolatesContradictoryMatch() throws IOException {
    // Given
    String csv = fixture("calendar.csv");
    String row = csv.lines().skip(1).findFirst().orElseThrow();

    // When
    SportingObservation.Calendar duplicate =
        calendars.parse(bytes(csv + row + "\n"), page(fixture("calendar.html")), SCOPE);
    SportingObservation.Calendar conflict =
        calendars.parse(
            bytes(csv + row.replace("3/0", "0/3") + "\n"), page(fixture("calendar.html")), SCOPE);

    // Then
    assertThat(duplicate.matches()).hasSize(1);
    assertThat(duplicate.complete()).isTrue();
    assertThat(conflict.matches()).isEmpty();
    assertThat(conflict.complete()).isFalse();
    assertThat(conflict.failures())
        .singleElement()
        .satisfies(failure -> assertThat(failure.sourceReference()).isEqualTo("TST001"));
  }

  @Test
  @DisplayName("Keeps 99 usable matches when one participant is invalid")
  void keepsUsablePartialCalendar() throws IOException {
    // Given
    String source = fixture("calendar.html");
    String html =
        source.substring(0, source.indexOf("<table>"))
            + "<table><tr><td>Journée 01</td></tr>"
            + IntStream.rangeClosed(1, 100)
                .mapToObj(
                    i ->
                        "<tr><td>M"
                            + i
                            + "</td><td>01/10/26</td><td></td><td>A</td><td></td><td>B</td></tr>")
                .collect(Collectors.joining())
            + "</table></body></html>";
    String csv =
        fixture("calendar.csv").lines().findFirst().orElseThrow()
            + "\n"
            + IntStream.rangeClosed(1, 100)
                .mapToObj(
                    i ->
                        "ABCCS;01;M"
                            + i
                            + ";2026-10-01;00:00;001;A;"
                            + (i == 50 ? "" : "002")
                            + ";B;;;;;;;\n")
                .collect(Collectors.joining());

    // When
    SportingObservation.Calendar result = calendars.parse(bytes(csv), page(html), SCOPE);

    // Then
    assertThat(result.matches()).hasSize(99);
    assertThat(result.failures()).hasSize(1);
    assertThat(result.complete()).isFalse();
  }

  @Test
  @DisplayName("Distinguishes unknown time from an invalid date without dropping the match")
  void isolatesInvalidSecondaryValue() throws IOException {
    // Given
    String csv = fixture("calendar.csv").replace("2026-10-01;20:00", "not-a-date;00:00");

    // When
    SportingObservation.Calendar result =
        calendars.parse(bytes(csv), page(fixture("calendar.html")), SCOPE);

    // Then
    assertThat(result.matches())
        .singleElement()
        .satisfies(
            match -> {
              assertThat(match.facts().localDate()).isNull();
              assertThat(match.facts().localTime().isPresent()).isTrue();
              assertThat(match.facts().localTime().get()).isNull();
              assertThat(match.facts().timeZone()).isNull();
            });
    assertThat(result.failures()).hasSize(1);
  }

  @Test
  @DisplayName("Rejects wrong-season and recent-only contexts before producing observations")
  void rejectsUnqualifiedContext() throws IOException {
    // Given
    String html = fixture("calendar.html");

    // When / Then
    assertThatThrownBy(() -> page(html.replace("2026/2027", "2025/2026")))
        .isInstanceOf(FfvbAcquisitionException.class);
    assertThatThrownBy(
            () ->
                new FfvbPage(
                    bytes(html),
                    URI.create("https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php"),
                    SCOPE))
        .isInstanceOf(FfvbAcquisitionException.class);
  }

  @Test
  @DisplayName("A header-only export cannot erase matches still published in the full calendar")
  void refusesFalseEmpty() throws IOException {
    // Given
    String header = fixture("calendar.csv").lines().findFirst().orElseThrow() + "\n";

    // When
    SportingObservation.Calendar result =
        calendars.parse(bytes(header), page(fixture("calendar.html")), SCOPE);

    // Then
    assertThat(result.complete()).isFalse();
    assertThat(result.failures()).hasSize(2);
  }

  @Test
  @DisplayName(
      "Keeps official order, positions and special statistics without filling blanks with zero")
  void preservesOfficialStandings() throws IOException {
    // Given
    FfvbPage page = page(fixture("calendar.html"));

    // When
    SportingObservation.Standings result = standings.parse(page);

    // Then
    assertThat(result.columns()).containsExactly("Points", "Jou.", "Coeff.S");
    assertThat(result.rows())
        .extracting(SportingObservation.Standing::position)
        .containsExactly(2, 1);
    assertThat(result.rows().getFirst().statistics()).containsEntry("Coeff.S", "MAX");
    assertThat(result.rows().get(1).statistics()).doesNotContainKey("Points");
  }

  /**
   * Loads synthetic source text before applying provider transport encoding.
   *
   * @param name synthetic UTF-8 fixture
   * @return its source text before transport encoding
   */
  private String fixture(String name) throws IOException {
    try (InputStream input = getClass().getResourceAsStream("/acquisition/ffvb/" + name)) {
      return new String(input.readAllBytes(), StandardCharsets.UTF_8);
    }
  }

  /**
   * Encodes synthetic text using the provider format.
   *
   * @param text synthetic source
   * @return actual FFVB transport encoding
   */
  private byte[] bytes(String text) {
    return text.getBytes(FfvbPage.CHARSET);
  }

  /**
   * Qualifies a synthetic full calendar against the admitted scope.
   *
   * @param html synthetic full calendar
   * @return context qualified against the admitted scope
   */
  private FfvbPage page(String html) {
    return new FfvbPage(bytes(html), URL, SCOPE);
  }
}
