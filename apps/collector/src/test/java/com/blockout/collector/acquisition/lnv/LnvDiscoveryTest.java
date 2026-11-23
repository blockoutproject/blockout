package com.blockout.collector.acquisition.lnv;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Synthetic pages exercise native HTML URL resolution without contacting the provider. */
@DisplayName("LNV phase navigation")
class LnvDiscoveryTest {
  private static final URI CALENDAR =
      URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=902");

  @ParameterizedTest
  @ValueSource(strings = {"Marmara SpikeLigue", "Saforelle Power 6", "Ligue B Masculine"})
  @DisplayName("Historical championship headings qualify without inventing a season")
  void qualifiesHistoricalHeading(String championship) {
    // Given
    URI page = URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901");
    String html =
        "<title>Site de compétition par Data Project</title>"
            + "<h2 class='CompetitionDescription_Header'>"
            + championship
            + "</h2><span id='phase_lbl_title'>Play-Offs Standing</span>"
            + "<a href='CompetitionMatches.aspx?ID=901&PID=902'>Play-Offs</a>";

    // When
    String season =
        new LnvDiscovery().root(html.getBytes(StandardCharsets.UTF_8), page, "901").season();

    // Then
    assertThat(season).isNull();
  }

  @Test
  @DisplayName("An unrelated historical championship remains unsupported")
  void rejectsUnrelatedHistoricalHeading() {
    // Given
    URI page = URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901");
    String html =
        "<title>Site de compétition par Data Project</title>"
            + "<h2 class='CompetitionDescription_Header'>Coupe de France</h2>"
            + "<a href='CompetitionMatches.aspx?ID=901&PID=902'>Final</a>";

    // When / Then
    assertThatThrownBy(
            () -> new LnvDiscovery().root(html.getBytes(StandardCharsets.UTF_8), page, "901"))
        .isInstanceOf(LnvAcquisitionException.class);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "<a href='?ID=901&PID=902'>Regular</a>",
        "<base href='https://lnv-web.dataproject.com/'><a href='CompetitionMatches.aspx?ID=901&PID=902'>Regular</a>"
      })
  @DisplayName("Phase links resolve against their HTML context")
  void resolvesPublishedPhaseLinks(String html) {
    // Given
    URI page = URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901");
    byte[] championship =
        ("<title>Marmara SpikeLigue</title>" + html).getBytes(StandardCharsets.UTF_8);

    // When
    List<LnvDiscovery.Phase> links = new LnvDiscovery().root(championship, page, "901").phases();

    // Then
    assertThat(links)
        .containsExactly(
            new LnvDiscovery.Phase(
                URI.create(
                    "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901&PID=902"),
                "902",
                "Regular"));
  }

  @Test
  @DisplayName("Conflicting names keep the discovered phase without an assumed label")
  void leavesContradictoryPhaseLabelUnknown() {
    // Given
    URI page = URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901");
    byte[] championship =
        """
        <title>Marmara SpikeLigue</title>
        <a href='CompetitionMatches.aspx?ID=901&PID=902'>Regular</a>
        <a href='CompetitionMatches.aspx?ID=901&PID=902'>Playoffs</a>
        """
            .getBytes(StandardCharsets.UTF_8);

    // When
    List<LnvDiscovery.Phase> phases = new LnvDiscovery().root(championship, page, "901").phases();

    // Then
    assertThat(phases)
        .singleElement()
        .satisfies(
            phase -> {
              assertThat(phase.reference()).isEqualTo("902");
              assertThat(phase.label()).isNull();
            });
  }

  @Test
  @DisplayName("A foreign document base cannot qualify a phase link")
  void rejectsForeignDocumentBase() {
    // Given
    URI page = URI.create("https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=901");
    String html =
        """
        <title>Marmara SpikeLigue</title><base href='https://foreign.example/'>
        <a href='CompetitionMatches.aspx?ID=901&PID=902'>Regular</a>
        """;

    // When / Then
    assertThatThrownBy(
            () -> new LnvDiscovery().root(html.getBytes(StandardCharsets.UTF_8), page, "901"))
        .isInstanceOf(LnvAcquisitionException.class);
  }

  @Test
  @DisplayName("Published phase dates spanning both civil years establish one sporting season")
  void establishesSeasonFromMatchDates() {
    // Given
    byte[] calendar =
        phasePage(
            "<div id='Content_Main_LYR_Header_ChampionshipMatches'><h3>Saison Régulière</h3></div>",
            "03/10/2027 - 14:00",
            "31/11/2027",
            "12/04/2028 - --:--");
    LnvDiscovery.Phase published = new LnvDiscovery.Phase(CALENDAR, "902", "Calendrier");

    // When
    LnvDiscovery.PhaseCatalog phase =
        new LnvDiscovery().phaseCatalog(calendar, CALENDAR, "901", published, null);

    // Then
    assertThat(phase.season()).isEqualTo("2027/2028");
    assertThat(phase.label()).isEqualTo("Saison Régulière");
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "20/05/2028 - 20:00", "31/11/2027"})
  @DisplayName("A published playoff can inherit its season without establishing one independently")
  void acceptsPlayoffWithLimitedDates(String date) {
    // Given
    byte[] calendar = phasePage("<h3>1/4 Finale - Match 1</h3>", date);
    LnvDiscovery.Phase published = new LnvDiscovery.Phase(CALENDAR, "902", "Play-Offs");

    // When
    LnvDiscovery.PhaseCatalog phase =
        new LnvDiscovery().phaseCatalog(calendar, CALENDAR, "901", published, "2027/2028");

    // Then
    assertThat(phase.season()).isNull();
    assertThat(phase.label()).isEqualTo("Play-Offs");
    assertThat(phase.pools()).hasSize(1);
  }

  @Test
  @DisplayName("Explicit season evidence still qualifies a phase with no published match dates")
  void preservesExplicitSeasonEvidence() {
    // Given
    byte[] calendar = phasePage("<title>Alterna VOLSTAR 2027/2028</title>");
    LnvDiscovery.Phase published = new LnvDiscovery.Phase(CALENDAR, "902", "Calendrier");

    // When
    LnvDiscovery.PhaseCatalog phase =
        new LnvDiscovery().phaseCatalog(calendar, CALENDAR, "901", published, null);

    // Then
    assertThat(phase.season()).isEqualTo("2027/2028");
    assertThat(phase.label()).isNull();
  }

  @Test
  @DisplayName("A date outside the established season refuses the phase")
  void rejectsDateOutsideExpectedSeason() {
    // Given
    byte[] calendar = phasePage("", "03/10/2028");
    LnvDiscovery.Phase published = new LnvDiscovery.Phase(CALENDAR, "902", null);

    // When / Then
    assertThatThrownBy(
            () ->
                new LnvDiscovery().phaseCatalog(calendar, CALENDAR, "901", published, "2027/2028"))
        .isInstanceOf(LnvAcquisitionException.class);
  }

  @Test
  @DisplayName("Dates in different sporting periods cannot establish a season")
  void rejectsDatesFromMultipleSportingPeriods() {
    // Given
    byte[] calendar = phasePage("", "30/06/2027", "03/10/2028");
    LnvDiscovery.Phase published = new LnvDiscovery.Phase(CALENDAR, "902", null);

    // When / Then
    assertThatThrownBy(
            () -> new LnvDiscovery().phaseCatalog(calendar, CALENDAR, "901", published, null))
        .isInstanceOf(LnvAcquisitionException.class)
        .hasMessage("LNV phase match dates contradict the season");
  }

  private static byte[] phasePage(String header, String... dates) {
    StringBuilder page =
        new StringBuilder(header)
            .append(
                "<div class='rmpView' id='Content_Main_903'><span id='group_lbl_title'>Group</span>");
    for (int index = 0; index < dates.length; index++) {
      page.append(
          "<div id='match_%d_MatchRow'><span id='match_%d_LB_DataOra'>%s</span></div>"
              .formatted(index, index, dates[index]));
    }
    return page.append("</div>").toString().getBytes(StandardCharsets.UTF_8);
  }
}
