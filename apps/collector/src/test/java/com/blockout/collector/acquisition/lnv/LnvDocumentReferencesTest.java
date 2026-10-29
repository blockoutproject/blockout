package com.blockout.collector.acquisition.lnv;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.config.AcquisitionProperties;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import org.apache.hc.core5.http.NameValuePair;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.parser.Parser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

/** Synthetic published postback state exercises the provider-shape boundary without network I/O. */
@DisplayName("LNV document form state qualification")
class LnvDocumentReferencesTest {
  @ParameterizedTest
  @ValueSource(strings = {"[]", "null", "true", "42", "\"opaque\""})
  @DisplayName("Rejects non-object client state as an acquisition refusal")
  void rejectsNonObjectClientState(String state) {
    // Given
    URI page = URI.create("https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=990&ID=901");
    String html =
        """
        <form method=post action="MatchStatistics.aspx?mID=990&ID=901">
        <div id=Tabs><li class=rtsLI>Scoresheet</li></div>
        <input type=hidden id=State name=State value='%s'>
        </form><script>
        $create(Telerik.Web.UI.RadTabStrip, {"_postBackReference":"__doPostBack('tabs','arguments')","clientStateFieldID":"State","tabData":[{}]}, null, null, $get("Tabs"));
        </script>
        """
            .formatted(state);
    LnvDocumentReferences references = new LnvDocumentReferences();

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> references.form(html.getBytes(StandardCharsets.UTF_8), page, "Scoresheet");

    // Then
    assertThatThrownBy(read).isInstanceOf(LnvAcquisitionException.class);
  }

  @Test
  @DisplayName("Document postbacks retain native submitted controls without disabled fields")
  void preservesSubmittedFormControls() {
    // Given
    URI page = URI.create("https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=990&ID=901");
    String html =
        """
        <form method=post action="MatchStatistics.aspx?mID=990&ID=901">
        <input type=hidden name=__VIEWSTATE value=synthetic-state>
        <input type=hidden name=disabled-state value=not-submitted disabled>
        <select name=language><option value=fr selected>French</option></select>
        <input type=checkbox name=confirmed value=yes checked>
        <input type=checkbox name=unchecked value=no>
        <div id=NativeTabs><ul><li class=rtsLI>Scoresheet</li></ul></div>
        <input type=hidden id=NativeTabs_State name=Native$Tabs$State value='{"selectedIndexes":[]}'>
        </form><script>
        $create(Telerik.Web.UI.RadTabStrip, {"_postBackReference":"__doPostBack('actual$Control','arguments')","clientStateFieldID":"NativeTabs_State","tabData":[{"value":"sheet"}]}, null, null, $get("NativeTabs"));
        </script>
        """;

    // When
    LnvDocumentReferences.Form form =
        new LnvDocumentReferences().form(html.getBytes(StandardCharsets.UTF_8), page, "Scoresheet");

    // Then
    assertThat(form.fields())
        .extracting(NameValuePair::getName, NameValuePair::getValue)
        .contains(
            tuple("__VIEWSTATE", "synthetic-state"),
            tuple("language", "fr"),
            tuple("confirmed", "yes"));
    assertThat(form.fields())
        .extracting(NameValuePair::getName)
        .doesNotContain("disabled-state", "unchecked");
  }

  @ParameterizedTest
  @ValueSource(strings = {"MatchStatistics.aspx?mID=990&ID=901", "?mID=990&ID=901", ""})
  @DisplayName("The actual tab order and hidden state determine the document form request")
  void resolvesPublishedDocumentForm(String action) {
    // Given
    URI page = URI.create("https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=990&ID=901");
    String html =
        """
        <form method=post action="%s">
        <input type=hidden name=__VIEWSTATE value=synthetic-state>
        <input type=hidden name=__EVENTVALIDATION value=synthetic-validation>
        <div id=NativeTabs><ul><li class=rtsLI>Scoresheet</li><li class=rtsLI>Statistics</li><li class=rtsLI>DataVolley</li></ul></div>
        <input type=hidden id=NativeTabs_State name=Native$Tabs$State value='{"selectedIndexes":["1"]}'>
        </form><script>
        $create(Telerik.Web.UI.RadTabStrip, {"_postBackReference":"__doPostBack('actual$Control','arguments')","clientStateFieldID":"NativeTabs_State","tabData":[{"value":"sheet"},{"value":"stats"},{"value":"volley"}]}, null, null, $get("NativeTabs"));
        </script>
        """
            .formatted(action);

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
  }

  @Test
  @DisplayName("Reads the exact published PDF link")
  void readsPublishedPdf() {
    // Given
    URI page = URI.create("https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=990&ID=901");
    byte[] html =
        "<iframe src='https://documents.example.invalid/qualified.pdf'></iframe>"
            .getBytes(StandardCharsets.UTF_8);

    // When
    URI pdf = new LnvDocumentReferences().publishedPdf(html, page);

    // Then
    assertThat(pdf).isEqualTo(URI.create("https://documents.example.invalid/qualified.pdf"));
  }

  @Test
  @DisplayName("Reads a document code from exact verified season and team associations")
  void qualifiesDocumentCode() {
    // Given
    Document index = Jsoup.parse(documentIndex(1), "", Parser.xmlParser());

    // When
    SportingObservation.InformationSheet sheet =
        new LnvDocumentReferences()
            .informationSheet(
                index, 2026, "901", "LAM", "001", "002", LocalDate.of(2026, 10, 17), ASSOCIATIONS);

    // Then
    assertThat(sheet)
        .isEqualTo(new SportingObservation.InformationSheet("2026/2027", "AALNV", "00AA"));
  }

  @Test
  @DisplayName("Refuses document associations belonging to another season")
  void rejectsForeignAssociationSeason() {
    // Given
    Document index = Jsoup.parse(documentIndex(1), "", Parser.xmlParser());

    // When
    SportingObservation.InformationSheet sheet =
        new LnvDocumentReferences()
            .informationSheet(
                index, 2025, "901", "LAM", "001", "002", LocalDate.of(2025, 10, 17), ASSOCIATIONS);

    // Then
    assertThat(sheet).isNull();
  }

  @Test
  @DisplayName("Refuses an ambiguous repeated document match")
  void rejectsDuplicateDocumentMatch() {
    // Given
    Document index = Jsoup.parse(documentIndex(2), "", Parser.xmlParser());

    // When
    SportingObservation.InformationSheet sheet =
        new LnvDocumentReferences()
            .informationSheet(
                index, 2026, "901", "LAM", "001", "002", LocalDate.of(2026, 10, 17), ASSOCIATIONS);

    // Then
    assertThat(sheet).isNull();
  }

  @Test
  @DisplayName("An XML index cannot supply a document code for another championship")
  void rejectsForeignIndexChampionship() {
    // Given
    Document index =
        Jsoup.parse(
            documentIndex(1).replace("CodeCompetition=\"LAM\"", "CodeCompetition=\"LAF\""),
            "",
            Parser.xmlParser());
    LnvDocumentReferences references = new LnvDocumentReferences();

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () ->
            references.informationSheet(
                index, 2026, "901", "LAM", "001", "002", LocalDate.of(2026, 10, 17), ASSOCIATIONS);

    // Then
    assertThatThrownBy(read).isInstanceOf(LnvAcquisitionException.class);
  }

  @ParameterizedTest
  @CsvSource({"true, unknown", "false, 002"})
  @DisplayName("A match without an exact association does not qualify unrelated index content")
  void omitsUnassociatedDocument(boolean dated, String away) {
    // Given
    Document index = Jsoup.parse("<Unexpected/>", "", Parser.xmlParser());
    LocalDate date = dated ? LocalDate.of(2026, 10, 17) : null;

    // When
    SportingObservation.InformationSheet sheet =
        new LnvDocumentReferences()
            .informationSheet(index, 2026, "901", "LAM", "001", away, date, ASSOCIATIONS);

    // Then
    assertThat(sheet).isNull();
  }

  private static final List<AcquisitionProperties.DocumentTeamAssociation> ASSOCIATIONS =
      List.of(
          new AcquisitionProperties.DocumentTeamAssociation(2026, "901", "001", "HOME XML"),
          new AcquisitionProperties.DocumentTeamAssociation(2026, "901", "002", "AWAY XML"));

  /**
   * Builds one explicit native document entry, repeated only for the ambiguity scenario.
   *
   * @param occurrences number of published entries with the same identifying facts
   * @return synthetic XML without parser actions or installed doubles
   */
  private static String documentIndex(int occurrences) {
    String match =
        """
        <Match><CodeMatch>00AA</CodeMatch><EquipeDomicile>HOME XML</EquipeDomicile>
        <EquipeExterieur>AWAY XML</EquipeExterieur><Date>17-10-2026</Date><Score>0-3</Score></Match>
        """;
    return "<Calendrier><Competition CodeCompetition=\"LAM\"><Journee>"
        + match.repeat(occurrences)
        + "</Journee></Competition></Calendrier>";
  }
}
