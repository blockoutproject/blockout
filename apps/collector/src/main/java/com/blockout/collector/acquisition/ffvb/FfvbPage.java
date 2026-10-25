package com.blockout.collector.acquisition.ffvb;

import com.blockout.collector.acquisition.application.FfvbAcquisitionException;
import java.net.URI;
import java.nio.charset.Charset;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hc.core5.http.NameValuePair;
import org.apache.hc.core5.http.message.BasicNameValuePair;
import org.apache.hc.core5.net.URIBuilder;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.FormElement;

/** Contextual HTML qualification shared by FFVB calendar and official standings interpretation. */
public final class FfvbPage {
  static final Charset CHARSET = Charset.forName("windows-1252");
  private final FormElement export;
  private final Element standings;
  private final Set<String> references;
  private final Set<String> allReferences;
  private final boolean calendarPresent;
  private final boolean qualifiedEmpty;

  /**
   * Checks the actual published export form and associates tables using published pool context.
   *
   * @param body bounded complete-calendar HTML bytes
   * @param url actual complete-calendar URL
   * @param scope backend-qualified expected context
   */
  public FfvbPage(byte[] body, URI url, FfvbScope scope) {
    if (new URIBuilder(url)
        .getQueryParams().stream()
            .noneMatch(
                parameter ->
                    parameter.getName().equals("calend") && parameter.getValue().equals("COMPLET")))
      throw new FfvbAcquisitionException("A complete FFVB calendar is required");
    Document page = Jsoup.parse(new String(body, CHARSET), url.toString());
    export =
        page.select("form[action$=vbspo_calendrier_export.php]").stream()
            .filter(FormElement.class::isInstance)
            .map(FormElement.class::cast)
            .filter(form -> "E".equals(fields(form).get("typ_edition")))
            .findFirst()
            .orElseThrow(() -> new FfvbAcquisitionException("Missing FFVB export context"));
    Map<String, String> fields = fields(export);
    if (!fields
        .keySet()
        .containsAll(
            List.of(
                "cal_saison",
                "cal_codent",
                "cal_codpoule",
                "cal_coddiv",
                "cal_codtour",
                "typ_edition",
                "type",
                "rech_equipe"))) throw new FfvbAcquisitionException("Incomplete FFVB export form");
    if (!scope.seasonLabel().equals(fields.get("cal_saison"))
        || !scope.organizerReference().equals(fields.get("cal_codent"))
        || !value(scope.tourReference()).equals(fields.get("cal_codtour"))
        || !"".equals(fields.get("rech_equipe"))
        || !"RES".equals(fields.get("type")))
      throw new FfvbAcquisitionException("FFVB context does not match the admitted scope");
    String selected =
        scope.groupReference() == null ? scope.poolReference() : scope.groupReference();
    boolean grouped = fields.get("cal_codpoule").isEmpty();
    if ((!grouped && !scope.poolReference().equals(fields.get("cal_codpoule")))
        || (grouped
            && (scope.tourReference() == null
                || !fields.get("cal_coddiv").equals(scope.competitionReference()))))
      throw new FfvbAcquisitionException("Unqualified FFVB pool context");
    Element selectedStandings = null;
    LinkedHashSet<String> selectedReferences = new LinkedHashSet<>();
    LinkedHashSet<String> publishedReferences = new LinkedHashSet<>();
    boolean selectedCalendar = false;
    String currentGroup = grouped ? null : selected;
    for (Element table : page.select("table")) {
      if (table.select("table").size() > 1) continue;
      Set<String> pools =
          table.select("input[name=poule]").stream()
              .map(input -> input.attr("value"))
              .collect(Collectors.toSet());
      if (pools.size() > 1) throw new FfvbAcquisitionException("Contradictory FFVB group context");
      if (pools.size() == 1) currentGroup = pools.iterator().next();
      List<Element> rows = table.select("tr");
      if (rows.isEmpty()) continue;
      List<String> heading = cells(rows.getFirst());
      if (selected.equals(currentGroup) && heading.contains("Points") && heading.contains("Jou.")) {
        if (selectedStandings != null)
          throw new FfvbAcquisitionException("Ambiguous FFVB standings context");
        selectedStandings = table;
      }
      if (heading.stream()
          .anyMatch(text -> text.startsWith("Journée ") || text.startsWith("Tour "))) {
        if (selected.equals(currentGroup)) selectedCalendar = true;
        for (Element row : rows) {
          List<String> cells = cells(row);
          if (cells.size() >= 6 && !cells.getFirst().isBlank()) {
            publishedReferences.add(cells.getFirst());
            if (selected.equals(currentGroup)) selectedReferences.add(cells.getFirst());
          }
        }
      }
    }
    standings = selectedStandings;
    references = Collections.unmodifiableSet(selectedReferences);
    allReferences = Collections.unmodifiableSet(publishedReferences);
    // Positive empty-pool context uses the named published scope and its native empty container.
    // An unknown pool, shared round without its group or header-only export supplies no such proof.
    qualifiedEmpty =
        !grouped
            && !selectedCalendar
            && selectedStandings == null
            && page.select("td").stream()
                .map(Element::ownText)
                .anyMatch(
                    text ->
                        text.strip().startsWith(scope.poolReference() + " - ")
                            && text.strip().length() > scope.poolReference().length() + 3)
            && page.select("td[colspan=11]").stream()
                .anyMatch(cell -> cell.text().isBlank() && cell.children().isEmpty());
    calendarPresent = selectedCalendar || qualifiedEmpty;
  }

  /**
   * Resolves the provider-published export action.
   *
   * @return the published export action, still subject to the existing HTTP origin allowlist
   */
  public URI exportUrl() {
    return URI.create(export.absUrl("action"));
  }

  /**
   * Preserves the native form values for the bounded export request.
   *
   * @return native published form values; no guessed pool inventory or transport instructions
   */
  public List<NameValuePair> exportFields() {
    return export.formData().stream()
        .<NameValuePair>map(field -> new BasicNameValuePair(field.key(), field.value()))
        .toList();
  }

  /**
   * Exposes match references attributed to the selected contextual group.
   *
   * @return actual published match references for the selected contextual group
   */
  Set<String> references() {
    return references;
  }

  /**
   * Retains the actual references of every contextual group in this shared resource.
   *
   * @return published references without inferred code-prefix membership
   */
  Set<String> allReferences() {
    return allReferences;
  }

  /**
   * Distinguishes a recognized calendar from an arbitrary successful HTML response.
   *
   * @return whether a full calendar section was positively recognized
   */
  boolean calendarPresent() {
    return calendarPresent;
  }

  /**
   * Exposes only the official table attributed to this scope.
   *
   * @return the qualified official table, or null when publication was not established
   */
  Element standings() {
    return standings;
  }

  /**
   * Distinguishes positive empty-pool evidence from missing publication context.
   *
   * @return positively attributed named pool with the provider's empty calendar container
   */
  boolean qualifiedEmpty() {
    return qualifiedEmpty;
  }

  /**
   * Reads direct cells without mixing nested unrelated tables.
   *
   * @param row one HTML row
   * @return direct cell text, excluding nested unrelated tables
   */
  static List<String> cells(Element row) {
    return row.children().stream()
        .filter(cell -> cell.tagName().equals("td") || cell.tagName().equals("th"))
        .map(Element::text)
        .map(String::strip)
        .toList();
  }

  /**
   * Indexes the provider-published form fields without inventing defaults.
   *
   * @param form published native form
   * @return exact field names and values
   */
  private static Map<String, String> fields(FormElement form) {
    return form.formData().stream()
        .collect(Collectors.toMap(field -> field.key(), field -> field.value()));
  }

  /**
   * Uses the provider form representation for an absent optional reference.
   *
   * @param value optional contextual reference
   * @return provider form's native empty representation
   */
  private static String value(String value) {
    return value == null ? "" : value;
  }
}
