package com.blockout.collector.acquisition.ffvb;

import com.blockout.collector.acquisition.application.FfvbAcquisitionException;
import com.blockout.collector.acquisition.application.ProviderQuery;
import com.blockout.collector.acquisition.application.SportingObservation.InformationSheet;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
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
  static final String EXPORT_FORM = "form[action$=vbspo_calendrier_export.php]";
  static final String RESULTS_HOST = "www.ffvbbeach.org";
  private static final String CALENDAR_MODE = "calend";
  private static final String COMPLETE_CALENDAR = "COMPLET";
  private static final String INFORMATION_PATH = "/ffvbapp/adressier/fiche_match_ffvb.php";
  private static final String SCORESHEET_PATH = "/ffvbapp/resu/ffvolley_fdme.php";
  private final FfvbScope scope;
  private final FormElement export;
  private final Element standings;
  private final Map<String, List<Element>> matchRows;
  private final Set<String> allReferences;
  private final boolean calendarPresent;
  private final boolean qualifiedEmpty;

  /** Requests the full calendar in discovery and in subsequent eligible sporting reads. */
  static URI completeCalendarUrl(URI url) throws URISyntaxException {
    return new URIBuilder(url).setParameter(CALENDAR_MODE, COMPLETE_CALENDAR).build();
  }

  /** Decodes bounded FFVB HTML with its response URL and native document base. */
  public static Document document(byte[] body, URI url) {
    return Jsoup.parse(new String(body, CHARSET), url.toString());
  }

  /**
   * Checks the actual published export form and associates tables using published pool context.
   *
   * @param body bounded complete-calendar HTML bytes
   * @param url actual complete-calendar URL
   * @param scope backend-qualified expected context
   */
  public FfvbPage(byte[] body, URI url, FfvbScope scope) {
    this(new Publication(url, document(body, url)), scope);
  }

  FfvbPage(Publication publication, FfvbScope scope) {
    this.scope = scope;
    export = publication.export;
    Map<String, String> fields = publication.fields;
    if (!scope.seasonLabel().equals(fields.get("cal_saison"))
        || !scope.organizerReference().equals(fields.get("cal_codent"))
        || !value(scope.tourReference()).equals(fields.get("cal_codtour"))
        || !"".equals(fields.get("rech_equipe"))
        || !"RES".equals(fields.get("type"))) {
      throw new FfvbAcquisitionException("FFVB context does not match the admitted scope");
    }
    String selected =
        scope.groupReference() == null ? scope.poolReference() : scope.groupReference();
    boolean grouped = fields.get("cal_codpoule").isEmpty();
    if ((!grouped && !scope.poolReference().equals(fields.get("cal_codpoule")))
        || (grouped
            && (scope.tourReference() == null
                || !fields.get("cal_coddiv").equals(scope.competitionReference())))) {
      throw new FfvbAcquisitionException("Unqualified FFVB pool context");
    }
    Group group = publication.group(selected, grouped);
    // The index stops at the first contradictory marker. An earlier table ambiguity keeps its
    // refusal.
    if (group.standings.size() > 1) {
      throw new FfvbAcquisitionException("Ambiguous FFVB standings context");
    }
    if (publication.contradictoryGroup) {
      throw new FfvbAcquisitionException("Contradictory FFVB group context");
    }
    standings = group.standings.isEmpty() ? null : group.standings.getFirst();
    matchRows = Collections.unmodifiableMap(group.matchRows);
    allReferences = Collections.unmodifiableSet(publication.allReferences);
    // Positive empty-pool context uses the named published scope and its native empty container.
    // An unknown pool, shared round without its group or header-only export supplies no such proof.
    qualifiedEmpty =
        !grouped
            && !group.calendarPresent
            && standings == null
            && publication.hasEmptyPoolContainer();
    calendarPresent = group.calendarPresent || qualifiedEmpty;
  }

  /** Retains the published form and table index for the sequential scopes of one HTML resource. */
  static final class Publication {
    private final Document document;
    private final FormElement export;
    private final Map<String, String> fields;
    private final Map<String, Group> groups = new LinkedHashMap<>();
    private final Set<String> allReferences = new LinkedHashSet<>();
    private Boolean emptyPoolContainer;
    private boolean contradictoryGroup;

    Publication(URI url, Document page) {
      document = page;
      Map<String, String> query =
          ProviderQuery.fields(
              url, () -> new FfvbAcquisitionException("Contradictory FFVB calendar URL fields"));
      if (!COMPLETE_CALENDAR.equals(query.get(CALENDAR_MODE))) {
        throw new FfvbAcquisitionException("A complete FFVB calendar is required");
      }
      export =
          page.select(EXPORT_FORM).stream()
              .filter(FormElement.class::isInstance)
              .map(FormElement.class::cast)
              .filter(form -> "E".equals(fields(form).get("typ_edition")))
              .findFirst()
              .orElseThrow(() -> new FfvbAcquisitionException("Missing FFVB export context"));
      fields = fields(export);
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
                  "rech_equipe"))) {
        throw new FfvbAcquisitionException("Incomplete FFVB export form");
      }
      indexTables(page);
    }

    private boolean hasEmptyPoolContainer() {
      if (emptyPoolContainer == null) {
        String poolHeading = fields.get("cal_codpoule") + " - ";
        emptyPoolContainer =
            document.select("td").stream()
                    .map(cell -> cell.ownText().strip())
                    .anyMatch(
                        text ->
                            text.startsWith(poolHeading) && text.length() > poolHeading.length())
                && document.select("td[colspan=11]").stream()
                    .anyMatch(cell -> cell.text().isBlank() && cell.children().isEmpty());
      }
      return emptyPoolContainer;
    }

    private void indexTables(Document page) {
      String currentGroup = null;
      for (Element table : page.select("table")) {
        if (table.select("table").size() > 1) {
          continue;
        }
        Set<String> pools =
            table.select("input[name=poule]").stream()
                .map(input -> input.attr("value"))
                .collect(Collectors.toSet());
        if (pools.size() > 1) {
          contradictoryGroup = true;
          return;
        }
        if (pools.size() == 1) {
          currentGroup = pools.iterator().next();
        }
        List<Element> rows = table.select("tr");
        if (rows.isEmpty()) {
          continue;
        }
        List<String> heading = cells(rows.getFirst());
        Group group = groups.computeIfAbsent(currentGroup, ignored -> new Group());
        if (heading.contains("Points") && heading.contains("Jou.")) {
          group.standings.add(table);
        }
        if (heading.stream()
            .anyMatch(text -> text.startsWith("Journée ") || text.startsWith("Tour "))) {
          group.calendarPresent = true;
          for (Element row : rows) {
            List<String> cells = cells(row);
            if (cells.size() >= 6 && !cells.getFirst().isBlank()) {
              String reference = cells.getFirst();
              allReferences.add(reference);
              group.matchRows.computeIfAbsent(reference, ignored -> new ArrayList<>()).add(row);
            }
          }
        }
      }
    }

    private Group group(String selected, boolean grouped) {
      Group explicit = groups.get(selected);
      Group initial = grouped ? null : groups.get(null);
      if (initial == null) {
        return explicit == null ? new Group() : explicit;
      }
      if (explicit == null) {
        return initial;
      }
      // A single-pool form already attributes leading tables before any explicit group marker.
      Group combined = new Group();
      combined.calendarPresent = initial.calendarPresent || explicit.calendarPresent;
      combined.standings.addAll(initial.standings);
      combined.standings.addAll(explicit.standings);
      combined.matchRows.putAll(initial.matchRows);
      explicit.matchRows.forEach(
          (reference, rows) ->
              combined.matchRows.merge(
                  reference,
                  rows,
                  (earlier, later) -> {
                    List<Element> merged = new ArrayList<>(earlier);
                    merged.addAll(later);
                    return merged;
                  }));
      return combined;
    }
  }

  private static final class Group {
    private final List<Element> standings = new ArrayList<>();
    private final Map<String, List<Element>> matchRows = new LinkedHashMap<>();
    private boolean calendarPresent;
  }

  String organizerReference() {
    return scope.organizerReference();
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
    return requestFields(export);
  }

  /**
   * Exposes match references attributed to the selected contextual group.
   *
   * @return actual published match references for the selected contextual group
   */
  Set<String> references() {
    return matchRows.keySet();
  }

  /** Independently accepted document proposals. Null leaves any retained reference intact. */
  record DocumentReferences(InformationSheet information, URI scoresheet) {}

  /**
   * Reads official document forms from the exact match rows already attributed to this pool or
   * group. Only their published identifiers may supply a proposal. Missing or unqualified forms
   * supply no withdrawal and cannot invalidate the sporting row.
   *
   * @param reference qualified native match code in this group
   * @return separate optional information and scoresheet references
   */
  DocumentReferences documents(String reference) {
    InformationSheet information = null;
    URI scoresheet = null;
    for (Element row : matchRows.getOrDefault(reference, List.of())) {
      for (Element candidate : row.select("form[method=post][action]")) {
        if (!(candidate instanceof FormElement form)) {
          continue;
        }
        URI action = documentAction(form);
        if (action == null) {
          continue;
        }
        if (INFORMATION_PATH.equals(action.getRawPath())
            && action.getRawQuery() == null
            && matchesDocumentFields(requestFields(form), "wss_saison", reference)) {
          information =
              new InformationSheet(scope.seasonLabel(), scope.organizerReference(), reference);
        } else if (scoresheet == null
            && SCORESHEET_PATH.equals(action.getRawPath())
            && form.formData().isEmpty()
            && matchesDocumentFields(
                new URIBuilder(action).getQueryParams(), "saison", reference)) {
          // The relay replays this empty form as GET. Repeats address the same qualified match.
          scoresheet = action;
        }
      }
    }
    return new DocumentReferences(information, scoresheet);
  }

  /** Refuses a document form outside the qualified FFVB HTTPS origin before using its fields. */
  private static URI documentAction(FormElement form) {
    URI action;
    try {
      action = URI.create(form.absUrl("action"));
    } catch (IllegalArgumentException invalid) {
      return null;
    }
    return hasOfficialResultsOrigin(action) ? action : null;
  }

  static boolean hasOfficialResultsOrigin(URI url) {
    return "https".equalsIgnoreCase(url.getScheme())
        && RESULTS_HOST.equalsIgnoreCase(url.getHost())
        && (url.getPort() == -1 || url.getPort() == 443)
        && url.getRawUserInfo() == null
        && url.getRawFragment() == null;
  }

  /** Matches the three published identifiers once each, regardless of their order. */
  private boolean matchesDocumentFields(
      List<NameValuePair> fields, String seasonField, String reference) {
    return fields.size() == 3
        && fields.contains(new BasicNameValuePair(seasonField, scope.seasonLabel()))
        && fields.contains(new BasicNameValuePair("codent", scope.organizerReference()))
        && fields.contains(new BasicNameValuePair("codmatch", reference));
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

  private static List<NameValuePair> requestFields(FormElement form) {
    return form.formData().stream()
        .<NameValuePair>map(field -> new BasicNameValuePair(field.key(), field.value()))
        .toList();
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
