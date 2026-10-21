package com.blockout.collector.acquisition.lnv;

import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.config.AcquisitionProperties.DocumentTeamAssociation;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.hc.core5.http.NameValuePair;
import org.apache.hc.core5.http.message.BasicNameValuePair;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.parser.Parser;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Narrow auxiliary document interpretation; XML never supplies sporting identity or facts. */
@Component
public class LnvDocumentReferences {
  /**
   * Selects only the three approved auxiliary indexes from the actual championship heading.
   *
   * @param title published native championship heading
   * @return documented XML competition code, or null without qualified scope
   */
  public String competitionCode(String title) {
    String text = title.toLowerCase(Locale.ROOT);
    if (text.contains("alterna volstar") || text.contains("ligue a masculine")) return "LAM";
    if (text.contains("saforelle volstar") || text.contains("ligue a féminine")) return "LAF";
    if (text.contains("volstar masculine 2") || text.contains("ligue b masculine")) return "LBM";
    return null;
  }

  private static final Pattern TAB =
      Pattern.compile(
          "\\$create\\(Telerik\\.Web\\.UI\\.RadTabStrip,\\s*(\\{.*?\\}),\\s*null,\\s*null,\\s*\\$get\\(\"([^\"]+)\"\\)\\)");
  private static final Pattern EVENT =
      Pattern.compile("__doPostBack\\('([^']+)'\\s*,\\s*'arguments'\\)");
  private static final JsonMapper JSON = JsonMapper.builder().build();

  /** Exact ordinary form request; hidden state remains ephemeral and never reaches diagnostics. */
  public record Form(URI action, List<NameValuePair> fields) {
    /** Detaches the source's hidden fields for one request. */
    public Form {
      fields = List.copyOf(fields);
    }
  }

  /**
   * Resolves the actual published document tab and native postback control without executing
   * scripts.
   *
   * @param html complete match page
   * @param page qualified match URL
   * @param label exact published Scoresheet or DataVolley label
   * @return source form, or null when that document tab is not published
   */
  public Form form(byte[] html, URI page, String label) {
    Document document = LnvPage.parse(html, page);
    for (Element script : document.select("script")) {
      Matcher controls = TAB.matcher(script.data());
      while (controls.find()) {
        Element strip = document.getElementById(controls.group(2));
        if (strip == null) continue;
        List<Element> tabs = strip.select("li.rtsLI");
        int selected = -1;
        for (int index = 0; index < tabs.size(); index++)
          if (label.equals(tabs.get(index).text())) selected = index;
        if (selected < 0) continue;
        JsonNode configuration = JSON.readTree(controls.group(1));
        JsonNode data = configuration.path("tabData");
        if (!data.isArray() || data.size() != tabs.size()) throw LnvPage.invalid();
        String index =
            data.get(selected).has("index")
                ? data.get(selected).get("index").asText()
                : Integer.toString(selected);
        Matcher event = EVENT.matcher(configuration.path("_postBackReference").asText());
        if (!index.matches("[0-9]+") || !event.matches()) throw LnvPage.invalid();
        Element form = strip.closest("form");
        if (form == null || !form.attr("method").equalsIgnoreCase("post")) throw LnvPage.invalid();
        List<NameValuePair> fields = new ArrayList<>();
        String state = configuration.path("clientStateFieldID").asText();
        Element previous = document.getElementById(state);
        String stateName = previous == null ? state : previous.attr("name");
        if (stateName.isBlank()) throw LnvPage.invalid();
        for (Element input : form.select("input[type=hidden][name]")) {
          String name = input.attr("name");
          if (name.equals("__EVENTTARGET")
              || name.equals("__EVENTARGUMENT")
              || name.equals(stateName)) continue;
          fields.add(new BasicNameValuePair(name, input.attr("value")));
        }
        fields.add(new BasicNameValuePair("__EVENTTARGET", event.group(1)));
        fields.add(
            new BasicNameValuePair(
                "__EVENTARGUMENT", JSON.writeValueAsString(Map.of("type", 0, "index", index))));
        ObjectNode clientState =
            previous != null && !previous.attr("value").isBlank()
                ? (ObjectNode) JSON.readTree(previous.attr("value"))
                : JSON.createObjectNode();
        clientState.putArray("selectedIndexes").add(index);
        fields.add(new BasicNameValuePair(stateName, JSON.writeValueAsString(clientState)));
        URI action = form.attr("action").isBlank() ? page : page.resolve(form.attr("action"));
        if (!page.getHost().equalsIgnoreCase(action.getHost())
            || !LnvPage.query(page).get("mID").equals(LnvPage.query(action).get("mID")))
          throw LnvPage.invalid();
        return new Form(action, fields);
      }
    }
    return null;
  }

  /**
   * Associates a document code only through verified scoped identities and unique exact evidence.
   *
   * @param xml complete bounded document index, read once per eligible passage
   * @param year qualified sporting start year
   * @param championship native LNV championship
   * @param code designated XML championship label
   * @param home native home TeamID
   * @param away native away TeamID
   * @param date independently observed sporting date
   * @param associations explicitly verified configuration
   * @return qualified information sheet, or null without a safe association
   */
  public SportingObservation.InformationSheet informationSheet(
      byte[] xml,
      long year,
      String championship,
      String code,
      String home,
      String away,
      LocalDate date,
      List<DocumentTeamAssociation> associations) {
    String homeLabel = label(year, championship, home, associations);
    String awayLabel = label(year, championship, away, associations);
    if (date == null || homeLabel == null || awayLabel == null) return null;
    Document index = Jsoup.parse(new String(xml, StandardCharsets.UTF_8), "", Parser.xmlParser());
    Element competition = index.selectFirst("Competition[CodeCompetition=" + code + "]");
    if (competition == null) throw LnvPage.invalid();
    List<Element> matches =
        competition.select("Match").stream()
            .filter(
                match ->
                    homeLabel.equals(match.select("EquipeDomicile").text())
                        && awayLabel.equals(match.select("EquipeExterieur").text())
                        && date.format(DateTimeFormatter.ofPattern("dd-MM-uuuu"))
                            .equals(match.select("Date").text()))
            .toList();
    if (matches.size() != 1) return null;
    String reference = matches.getFirst().select("CodeMatch").text();
    if (reference.isBlank()) return null;
    return new SportingObservation.InformationSheet(year + "/" + (year + 1), "AALNV", reference);
  }

  /**
   * Reads a published PDF link from an ordinary form response without fetching the PDF body.
   *
   * @param html bounded page after the source's published document form request
   * @param page qualified match/form base
   * @return one unambiguous PDF reference, otherwise unavailable
   */
  public URI publishedPdf(byte[] html, URI page) {
    List<URI> links =
        LnvPage.parse(html, page).select("iframe[src], embed[src], object[data], a[href]").stream()
            .map(
                element ->
                    element.hasAttr("src")
                        ? element.absUrl("src")
                        : element.hasAttr("data") ? element.absUrl("data") : element.absUrl("href"))
            .filter(value -> value.toLowerCase(Locale.ROOT).contains(".pdf"))
            .map(URI::create)
            .distinct()
            .toList();
    return links.size() == 1 ? links.getFirst() : null;
  }

  /**
   * Requires one exact association; conflicting configuration remains unavailable.
   *
   * @param year sporting year
   * @param championship native championship
   * @param team native TeamID
   * @param associations verified configuration
   * @return unique XML label or absence
   */
  private String label(
      long year, String championship, String team, List<DocumentTeamAssociation> associations) {
    List<String> labels =
        associations.stream()
            .filter(
                item ->
                    item.seasonStartYear() == year
                        && item.championshipReference().equals(championship)
                        && item.nativeTeamReference().equals(team))
            .map(DocumentTeamAssociation::xmlTeamLabel)
            .distinct()
            .toList();
    return labels.size() == 1 ? labels.getFirst() : null;
  }
}
