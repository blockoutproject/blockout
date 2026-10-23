package com.blockout.collector.acquisition.lnv;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.collector.acquisition.application.SportingObservation;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Synthetic DataProject fields isolate calendar and detail clocks from future provider
 * qualification.
 */
@DisplayName("Qualified LNV sporting page interpretations")
class LnvObservationsTest {
  private static final URI CALENDAR =
      URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=902");

  @Test
  @DisplayName("Calendar detail anchors retain the HTML document base")
  void resolvesDetailDocumentBase() throws Exception {
    // Given
    Document page;
    try (InputStream input = getClass().getResourceAsStream("/acquisition/lnv/calendar.html")) {
      page = Jsoup.parse(input, StandardCharsets.UTF_8.name(), CALENDAR.toString());
    }
    page.head().appendElement("base").attr("href", "https://lnv-web.dataproject.com/published/");
    for (Element row : page.select("[id$=_MatchRow]")) {
      row.select("[onclick]").removeAttr("onclick");
      row.appendElement("a")
          .attr("href", "MatchStatistics.aspx?mID=990&ID=901&CID=903&PID=902")
          .text("Details");
    }

    // When
    LnvCalendarParser.Read read =
        new LnvCalendarParser().parse(bytes(page.html()), CALENDAR, "901", "902", "903");

    // Then
    assertThat(read.calendar().matches())
        .singleElement()
        .satisfies(
            match ->
                assertThat(match.detailUrl())
                    .isEqualTo(
                        URI.create(
                            "https://lnv-web.dataproject.com/published/MatchStatistics.aspx?mID=990&ID=901&CID=903&PID=902")));
  }

  @Test
  @DisplayName("A foreign detail anchor is not reconstructed as a local match URL")
  void rejectsForeignDetailAnchor() throws Exception {
    // Given
    Document page;
    try (InputStream input = getClass().getResourceAsStream("/acquisition/lnv/calendar.html")) {
      page = Jsoup.parse(input, StandardCharsets.UTF_8.name(), CALENDAR.toString());
    }
    for (Element row : page.select("[id$=_MatchRow]")) {
      row.select("[onclick]").removeAttr("onclick");
      row.appendElement("a")
          .attr(
              "href", "https://foreign.example/MatchStatistics.aspx?mID=990&ID=901&CID=903&PID=902")
          .text("Details");
    }

    // When
    LnvCalendarParser.Read read =
        new LnvCalendarParser().parse(bytes(page.html()), CALENDAR, "901", "902", "903");

    // Then
    assertThat(read.calendar().complete()).isFalse();
    assertThat(read.calendar().matches()).isEmpty();
    assertThat(read.calendar().failures()).isNotEmpty();
  }

  @ParameterizedTest
  @ValueSource(strings = {"Alterna VOLSTAR", "Saforelle VOLSTAR", "VOLSTAR Masculine 2"})
  @DisplayName("Each supported championship requires actual season evidence")
  void qualifiesChampionship(String championship) {
    // Given
    String html =
        "<title>"
            + championship
            + " 2026/2027</title><a href='CompetitionMatches.aspx?ID=901&PID=902'>Regular</a>";

    // When
    String season = new LnvDiscovery().qualify(bytes(html), CALENDAR, "901");

    // Then
    assertThat(season).isEqualTo("2026/2027");
  }

  @Test
  @DisplayName("Unrelated ambiguous or malformed roster logos do not discard usable matches")
  void isolatesUnrelatedRosterImages() throws Exception {
    // Given
    String html;
    try (InputStream input = getClass().getResourceAsStream("/acquisition/lnv/calendar.html")) {
      html = new String(input.readAllBytes(), StandardCharsets.UTF_8);
    }
    html +=
        "<div id=unused1_DIV_Team><input id=a_HF_TeamID value=003><img src='https://images.dataproject.com/lnv/TeamLogo/placeholder.png'></div>"
            + "<div id=unused2_DIV_Team><input id=b_HF_TeamID value=004><img src='https://images.dataproject.com/lnv/TeamLogo/placeholder.png'></div>"
            + "<div id=unused3_DIV_Team><input id=c_HF_TeamID value=005><img src='http://[malformed'></div>";

    // When
    LnvCalendarParser.Read read =
        new LnvCalendarParser().parse(bytes(html), CALENDAR, "901", "902", "903");

    // Then
    assertThat(read.calendar().complete()).isTrue();
    assertThat(read.calendar().matches()).hasSize(1);
    assertThat(read.logos()).hasSize(2);
  }

  @Test
  @DisplayName("A local calendar clock without the confirmed offset-zero flag is omitted")
  void omitsUnqualifiedCalendarClock() throws Exception {
    // Given
    String html;
    try (InputStream input = getClass().getResourceAsStream("/acquisition/lnv/calendar.html")) {
      html =
          new String(input.readAllBytes(), StandardCharsets.UTF_8)
              .replace("value=\"True\"", "value=\"False\"");
    }

    // When
    SportingObservation.Facts facts =
        new LnvCalendarParser()
            .parse(bytes(html), CALENDAR, "901", "902", "903")
            .calendar()
            .matches()
            .getFirst()
            .facts();

    // Then
    assertThat(facts.localDate().get()).isEqualTo(LocalDate.of(2026, 10, 17));
    assertThat(facts.localTime()).isNull();
  }

  @Test
  @DisplayName("A title alone cannot establish a usable empty calendar")
  void refusesFalseEmptyCalendar() {
    // Given
    String html = "<div id=Content_Main_903><span id=group_lbl_title>Alterna VOLSTAR</span></div>";

    // When / Then
    assertThatThrownBy(
            () -> new LnvCalendarParser().parse(bytes(html), CALENDAR, "901", "902", "903"))
        .isInstanceOf(LnvAcquisitionException.class);
  }

  @Test
  @DisplayName("Official grouped columns retain source order and nonnumeric values")
  void readsGroupedStandings() {
    // Given
    String html =
        """
        <div id=Content_Main_903><table class=rgMasterTable><thead>
        <tr><th>Equipe</th><th>Points</th><th colspan=2>Matchs</th></tr>
        <tr><th></th><th></th><th>Joués</th><th>Gagnés</th></tr></thead><tbody>
        <tr><td><input id=HF_TeamID value=001><span id=TeamName>Home</span></td><td>9</td><td>3</td><td>3</td></tr>
        <tr><td><input id=HF_TeamID value=002><span id=TeamName>Away</span></td><td>-</td><td>0</td><td>0</td></tr>
        </tbody></table></div>
        """;

    // When
    SportingObservation.Standings table =
        new LnvStandingsParser().parse(bytes(html), CALENDAR, "903");

    // Then
    assertThat(table.rows())
        .extracting(SportingObservation.Standing::nativeTeamReference)
        .containsExactly("001", "002");
    assertThat(table.rows().get(1).statistics()).containsEntry("Points", "-");
    assertThat(table.columns()).containsExactly("Points", "Matchs / Joués", "Matchs / Gagnés");
  }

  @Test
  @DisplayName("A confirmed offset-zero detail clock crosses the Paris date boundary")
  void convertsDetailClock() {
    // Given
    String html =
        """
        <span id="Content_Main_LB_DateTime">samedi 17 octobre 2026 - 23:30</span>
        <span id="Content_Main_LB_SetsPartials">25/19 25/20 25/21</span>
        """;
    SportingObservation.Facts facts =
        new LnvDetailParser()
            .parse(
                bytes(html),
                URI.create(
                    "https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=990&ID=901&CID=903&PID=902"),
                "990",
                "901");
    // Then
    assertThat(facts.localDate().get()).isEqualTo(LocalDate.of(2026, 10, 18));
    assertThat(facts.localTime().get()).isEqualTo("01:30");
    assertThat(facts.timeZone()).isEqualTo("Europe/Paris");
    assertThat(facts.sets().get())
        .containsExactly(
            new SportingObservation.SetScore(25, 19),
            new SportingObservation.SetScore(25, 20),
            new SportingObservation.SetScore(25, 21));
  }

  @Test
  @DisplayName("A detail page carries its independently published aggregate correction")
  void readsDetailAggregate() {
    // Given
    String html =
        "<span id=Content_Main_LB_DateTime>samedi 17 octobre 2026</span>"
            + "<span id=Content_Main_LBL_WonSetHome>3</span><span id=Content_Main_LBL_WonSetGuest>2</span>";

    // When
    SportingObservation.Facts facts =
        new LnvDetailParser()
            .parse(
                bytes(html),
                URI.create("https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=990&ID=901"),
                "990",
                "901");

    // Then
    assertThat(facts.result()).isNotNull();
    assertThat(facts.result().get().homeSets()).isEqualTo(3);
    assertThat(facts.result().get().awaySets()).isEqualTo(2);
  }

  @Test
  @DisplayName("An invalid detail clock preserves independently published aggregate facts")
  void isolatesInvalidDetailClock() {
    // Given
    String html =
        "<span id=Content_Main_LB_DateTime>samedi 17 octobre 2026 - 24:00</span>"
            + "<span id=Content_Main_LBL_WonSetHome>3</span><span id=Content_Main_LBL_WonSetGuest>1</span>";

    // When
    SportingObservation.Facts facts =
        new LnvDetailParser()
            .parse(
                bytes(html),
                URI.create("https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=990&ID=901"),
                "990",
                "901");

    // Then
    assertThat(facts.localDate()).isNull();
    assertThat(facts.localTime()).isNull();
    assertThat(facts.result().get().homeSets()).isEqualTo(3);
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "invalid - 18:00", "17/10/2026 - 24:00"})
  @DisplayName("Missing or malformed schedule fields preserve identified calendar participants")
  void isolatesCalendarSchedule(String schedule) throws Exception {
    // Given
    String html;
    try (InputStream input = getClass().getResourceAsStream("/acquisition/lnv/calendar.html")) {
      html =
          new String(input.readAllBytes(), StandardCharsets.UTF_8)
              .replace("17/10/2026 - 23:30", schedule);
    }

    // When
    LnvCalendarParser.Read read =
        new LnvCalendarParser().parse(bytes(html), CALENDAR, "901", "902", "903");

    // Then
    assertThat(read.calendar().matches()).hasSize(1);
    assertThat(read.calendar().matches().getFirst().facts().result().get().homeSets()).isEqualTo(3);
    assertThat(read.calendar().complete()).isEqualTo(schedule.isBlank());
  }

  @ParameterizedTest
  @ValueSource(strings = {"3/F", "P/3", "F/3", "3/X"})
  @DisplayName("A native special or uninterpreted notation reaches F02 without invented scores")
  void retainsForfeitNotation(String notation) throws Exception {
    // Given
    String html;
    try (InputStream input = getClass().getResourceAsStream("/acquisition/lnv/calendar.html")) {
      html =
          new String(input.readAllBytes(), StandardCharsets.UTF_8)
              .replace(
                  "id=\"fixture_LB_SetCasa\">3",
                  "id=\"fixture_LB_SetCasa\">" + notation.split("/")[0])
              .replace(
                  "id=\"fixture_LB_SetOspiti\">1",
                  "id=\"fixture_LB_SetOspiti\">" + notation.split("/")[1]);
    }

    // When
    SportingObservation.Result result =
        new LnvCalendarParser()
            .parse(bytes(html), CALENDAR, "901", "902", "903")
            .calendar()
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
  @DisplayName("A date-only detail never becomes a midnight instant")
  void preservesUnknownTime() {
    // Given / When
    SportingObservation.Facts facts =
        new LnvDetailParser()
            .parse(
                bytes("<span id=Content_Main_LB_DateTime>samedi 17 octobre 2026</span>"),
                URI.create(
                    "https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=990&ID=901&CID=903&PID=902"),
                "990",
                "901");
    assertThat(facts.localDate().get()).isEqualTo(LocalDate.of(2026, 10, 17));
    assertThat(facts.localTime().get()).isNull();
    assertThat(facts.timeZone()).isNull();
  }

  @Test
  @DisplayName("Changing native phase IDs is discovered from published links")
  void followsPhaseLinks() {
    // Given
    String html =
        """
        <a href="CompetitionMatches.aspx?ID=901&PID=902">Regular</a>
        <a href="CompetitionMatches.aspx?ID=901&PID=904">Playoffs</a>
        <a href="CompetitionMatches.aspx?ID=901&PID=905">Final</a>
        <a href="CompetitionMatches.aspx?ID=999&PID=999">Other competition</a>
        """;
    // When / Then
    assertThat(new LnvDiscovery().phaseLinks(bytes(html), CALENDAR, "901"))
        .extracting(URI::toString)
        .containsExactly(
            "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=902",
            "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=904",
            "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=905");
  }

  @Test
  @DisplayName("Foreign match context and arbitrary successful HTML are refused")
  void rejectsWrongDetail() {
    // Given
    LnvDetailParser parser = new LnvDetailParser();
    assertThatThrownBy(() -> parser.parse(bytes("<h1>Error</h1>"), CALENDAR, "990", "901"))
        .isInstanceOf(LnvAcquisitionException.class);
    assertThatThrownBy(
            () ->
                parser.parse(
                    bytes("<span id=Content_Main_LB_DateTime>samedi 17 octobre 2026</span>"),
                    URI.create(
                        "https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=991&ID=901"),
                    "990",
                    "901"))
        .isInstanceOf(LnvAcquisitionException.class);
  }

  @Test
  @DisplayName(
      "Calendar uses native roster identities, deduplicates views and isolates contradictory rows")
  void parsesCalendar() throws Exception {
    // Given
    byte[] html;
    try (InputStream input = getClass().getResourceAsStream("/acquisition/lnv/calendar.html")) {
      html = input.readAllBytes();
    }

    // When
    LnvCalendarParser.Read read =
        new LnvCalendarParser().parse(html, CALENDAR, "901", "902", "903");
    // Then
    assertThat(read.calendar().matches()).hasSize(1);
    SportingObservation.Match match = read.calendar().matches().getFirst();
    assertThat(match.nativeMatchReference()).isEqualTo("990");
    assertThat(match.home().nativeTeamReference()).isEqualTo("001");
    assertThat(match.home().clubReference()).isNull();
    assertThat(match.facts().localTime().get()).isEqualTo("01:30");
    assertThat(read.logos()).containsKeys("001", "002");
    assertThat(read.calendar().complete()).isTrue();
  }

  @Test
  @DisplayName("Broken standings are refused instead of inventing an unpublished table")
  void rejectsBrokenStandings() {
    // Given / When / Then
    assertThatThrownBy(
            () -> new LnvStandingsParser().parse(bytes("<h1>Error</h1>"), CALENDAR, "903"))
        .isInstanceOf(LnvAcquisitionException.class);
  }

  /**
   * Encodes a synthetic native HTML fixture as UTF-8.
   *
   * @param html synthetic native fragment
   * @return provider encoding without stored raw payloads
   */
  private byte[] bytes(String html) {
    return html.getBytes(StandardCharsets.UTF_8);
  }
}
