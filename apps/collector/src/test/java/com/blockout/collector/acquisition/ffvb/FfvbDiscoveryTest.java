package com.blockout.collector.acquisition.ffvb;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.collector.acquisition.application.FfvbAcquisitionException;
import com.blockout.collector.acquisition.application.SportingObservation;
import java.net.URI;
import java.nio.charset.Charset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Synthetic native menu fixtures prove represented structures, not live or exhaustive coverage. */
@DisplayName("Published FFVB catalog contexts")
class FfvbDiscoveryTest {
  @Test
  @DisplayName(
      "A shared youth round discovers actual form-backed groups rather than one aggregate pool")
  void discoversNativeRoundGroups() throws Exception {
    // Given
    byte[] html;
    try (java.io.InputStream input =
        getClass().getResourceAsStream("/acquisition/ffvb/round.html")) {
      html = input.readAllBytes();
    }
    URI round =
        URI.create(
            "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2026/2027&codent=LIIDF&division=YOUTH&tour=01");

    // When
    SportingObservation.Catalog catalog =
        new FfvbDiscovery().parse(html, round, "2026/2027", "LIIDF");

    // Then
    assertThat(catalog.complete()).isTrue();
    assertThat(catalog.pools())
        .extracting(SportingObservation.Pool::groupReference)
        .containsExactly("GROUP-A", "GROUP-B");
    assertThat(catalog.pools())
        .extracting(SportingObservation.Pool::competitionReference)
        .containsOnly("YOUTH");
    assertThat(catalog.pools())
        .extracting(SportingObservation.Pool::tourReference)
        .containsOnly("01");
  }

  private static final URI ROOT =
      URI.create(
          "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=LIRA&saison=2026/2027");

  @Test
  @DisplayName("National selectors use published headings and exclude CDF options")
  void discoversNationalSelectors() {
    // Given
    String html =
        """
        <form><span>Elite</span><select name=listeN1>
        <option selected>Selection</option>
        <option value="vbspo_calendrier.php?saison=2026/2027&codent=ABCCS&poule=EA">Elite A</option>
        <option value="vbspo_calendrier.php?saison=2026/2027&codent=ABCCS&poule=CO">CDF Federal</option>
        </select></form>
        """;

    // When
    SportingObservation.Catalog catalog =
        parse(html, URI.create("https://www.ffvbbeach.org/ffvbapp/resu/pbscript.htm"), "ABCCS");

    // Then
    assertThat(catalog.complete()).isTrue();
    assertThat(catalog.pools())
        .extracting(SportingObservation.Pool::poolReference)
        .containsExactly("EA");
    assertThat(catalog.pools().getFirst().packReference()).isEqualTo("Elite");
  }

  @Test
  @DisplayName("A query season alone cannot turn an unsupported empty response into absence")
  void requiresPublishedSeasonForEmpty() {
    // Given
    String html = "<ul id=menu><li><a>Compétitions</a></li></ul>";

    // When / Then
    assertThatThrownBy(() -> parse(html, ROOT, "LIRA"))
        .isInstanceOf(FfvbAcquisitionException.class);
  }

  @Test
  @DisplayName("A retained season header without a competition catalog cannot prove absence")
  void refusesSeasonHeaderAlone() {
    // Given
    String html =
        "<select name=saison><option selected value='2026/2027'>2026/2027</option></select>";

    // When / Then
    assertThatThrownBy(() -> parse(html, ROOT, "LIRA"))
        .isInstanceOf(FfvbAcquisitionException.class);
  }

  @Test
  @DisplayName("A neutral round label remains excluded under a French Cup heading")
  void excludesCupRoundNavigation() {
    // Given
    String html =
        "<ul id=menu><li><a>Compétitions</a><ul><li><a>Coupe de France</a><ul>"
            + "<li><a href='vbspo_calendrier.php?saison=2026/2027&codent=LIRA&division=CUP&tour=01'>Tour 1</a></li>"
            + "</ul></li></ul></li></ul>";

    // When
    java.util.List<URI> rounds =
        new FfvbDiscovery()
            .roundLinks(html.getBytes(Charset.forName("windows-1252")), ROOT, "2026/2027", "LIRA");

    // Then
    assertThat(rounds).isEmpty();
  }

  @Test
  @DisplayName("A qualified native empty menu is distinct from a failed page")
  void acceptsQualifiedEmptyCatalog() {
    // Given
    String html =
        "<select name=saison><option selected value='2026/2027'>2026/2027</option></select><ul id=menu><li><a>Compétitions</a></li></ul>";

    // When
    SportingObservation.Catalog catalog = parse(html, ROOT, "LIRA");

    // Then
    assertThat(catalog.complete()).isTrue();
    assertThat(catalog.pools()).isEmpty();
  }

  @Test
  @DisplayName(
      "Published youth rounds distinguish a reused group code without treating matchdays as pools")
  void retainsPublishedRoundContext() {
    // Given
    String html =
        """
        <ul id=menu><li><a>Compétitions</a><ul><li><a>M18</a><ul>
        <li><a href="vbspo_calendrier.php?saison=2026/2027&codent=LIRA&poule=A&tour=1&jo=2">Group A round 1</a></li>
        <li><a href="vbspo_calendrier.php?saison=2026/2027&codent=LIRA&poule=A&tour=2&jo=3">Group A round 2</a></li>
        </ul></li></ul></li></ul>
        """;

    // When
    SportingObservation.Catalog catalog = parse(html, ROOT, "LIRA");

    // Then
    assertThat(catalog.pools())
        .extracting(SportingObservation.Pool::tourReference)
        .containsExactly("1", "2");
    assertThat(catalog.pools())
        .extracting(SportingObservation.Pool::groupReference)
        .containsOnly("A");
  }

  @Test
  @DisplayName(
      "Native pack headings and pool URLs survive without code-prefix or matchday grouping")
  void discoversContextualPools() {
    // Given
    String html =
        """
        <ul id="menu"><li><a>Compétitions</a><ul><li><a>PRENATIONAL</a><ul>
        <li><a href="vbspo_calendrier.php?saison=2026/2027&codent=LIRA&poule=PMA">PMA Pool A</a></li>
        <li><a href="vbspo_calendrier.php?saison=2026/2027&codent=LIRA&poule=PMB">PMB Pool B</a></li>
        </ul></li></ul></li></ul>
        """;

    // When
    SportingObservation.Catalog catalog = parse(html, ROOT, "LIRA");

    // Then
    assertThat(catalog.complete()).isTrue();
    assertThat(catalog.pools())
        .extracting(SportingObservation.Pool::poolReference)
        .containsExactly("PMA", "PMB");
    assertThat(catalog.pools())
        .extracting(SportingObservation.Pool::packReference)
        .containsOnly("PRENATIONAL");
    assertThat(catalog.pools()).allSatisfy(pool -> assertThat(pool.tourReference()).isNull());
  }

  @Test
  @DisplayName("An unrecognized page and a wrong season cannot establish an empty catalog")
  void refusesFalseEmpty() {
    // Given / When / Then
    assertThatThrownBy(() -> parse("<h1>Unavailable</h1>", ROOT, "LIRA"))
        .isInstanceOf(FfvbAcquisitionException.class);
    assertThatThrownBy(
            () ->
                parse(
                    "<ul id=menu><li><a>Compétitions</a><ul></ul></li></ul>",
                    URI.create(ROOT.toString().replace("2026/2027", "2025/2026")),
                    "LIRA"))
        .isInstanceOf(FfvbAcquisitionException.class);
  }

  @ParameterizedTest
  @ValueSource(strings = {"LIGU", "LIGY", "LIMART", "LIMY", "LIRE", "AALNV"})
  @DisplayName("Excluded organizers never produce FFVB sporting acquisition references")
  void excludesOrganizer(String organizer) {
    // Given / When / Then
    assertThatThrownBy(() -> parse("<ul id=menu></ul>", ROOT, organizer))
        .isInstanceOf(FfvbAcquisitionException.class);
  }

  @Test
  @DisplayName("A malformed covered link makes discovery partial while preserving usable pools")
  void keepsPartialCatalog() {
    // Given
    String html =
        """
        <ul id=menu><li><a>Compétitions</a><ul><li><a>REGIONAL</a><ul>
        <li><a href="vbspo_calendrier.php?saison=2026/2027&codent=LIRA&poule=AA">Pool A</a></li>
        <li><a href="vbspo_calendrier.php?saison=2026/2027&codent=LIRA">Broken pool</a></li>
        </ul></li><li><a>COUPE DE FRANCE</a><ul>
        <li><a href="vbspo_calendrier.php?saison=2026/2027&codent=LIRA&poule=CUP">Cup</a></li>
        </ul></li></ul></li></ul>
        """;
    // When
    SportingObservation.Catalog catalog = parse(html, ROOT, "LIRA");
    // Then
    assertThat(catalog.complete()).isFalse();
    assertThat(catalog.pools())
        .extracting(SportingObservation.Pool::poolReference)
        .containsExactly("AA");
  }

  /**
   * Encodes only synthetic provider-shaped HTML, retaining the native character encoding.
   *
   * @param html synthetic menu
   * @param url actual response context
   * @param organizer expected source owner
   * @return interpreted discovery
   */
  private SportingObservation.Catalog parse(String html, URI url, String organizer) {
    return new FfvbDiscovery()
        .parse(html.getBytes(Charset.forName("windows-1252")), url, "2026/2027", organizer);
  }
}
