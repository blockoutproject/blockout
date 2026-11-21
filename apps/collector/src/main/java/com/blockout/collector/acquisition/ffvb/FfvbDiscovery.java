package com.blockout.collector.acquisition.ffvb;

import com.blockout.collector.acquisition.application.FfvbAcquisitionException;
import com.blockout.collector.acquisition.application.ProviderQuery;
import com.blockout.collector.acquisition.application.SportingObservation;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.FormElement;
import org.springframework.stereotype.Component;

/**
 * Interprets published seasonal FFVB navigation without inferred inventories or code partitions.
 */
@Component
public class FfvbDiscovery {
  private static final Set<String> EXCLUDED =
      Set.of("LIGU", "LIGY", "LIMART", "LIMY", "LIRE", "AALNV");
  private static final String CALENDAR_SCRIPT = "vbspo_calendrier.php";

  /**
   * Reads a complete native organizer menu or national selector, preserving partial-link evidence.
   *
   * @param page bounded native page
   * @param season expected canonical season label
   * @param organizer expected supported organizer
   * @return contextual references; incomplete input cannot prove absence
   * @throws FfvbAcquisitionException for unsupported structure or contradictory root scope
   */
  public SportingObservation.Catalog parse(Document page, String season, String organizer) {
    URI url = URI.create(page.location());
    requireContext(url, season, organizer);
    SportingObservation.Catalog round = round(page, url, season, organizer);
    if (round != null) {
      return round;
    }
    Element menu = page.selectFirst("#menu");
    List<Element> links =
        menu == null ? page.select("select option[value]") : menu.select("a[href]");
    boolean recognized =
        menu != null && menu.text().contains("Compétitions")
            || links.stream()
                .anyMatch(
                    link -> link.attr("value").contains(CALENDAR_SCRIPT) && pack(link) != null);
    if (!recognized) {
      throw invalid();
    }
    boolean complete = true;
    boolean seasonProven =
        page.select("select[name=saison] option[selected], input[name=saison]").stream()
            .anyMatch(element -> season.equals(element.attr("value")));
    Map<List<String>, SportingObservation.Pool> pools = new LinkedHashMap<>();
    for (Element link : links) {
      String attribute = link.hasAttr("href") ? "href" : "value";
      String value = link.attr(attribute);
      if (!value.contains(CALENDAR_SCRIPT)) {
        continue;
      }
      String pack = pack(link);
      if (excludedCompetition(pack + " " + link.text())) {
        continue;
      }
      try {
        URI calendar = URI.create(link.absUrl(attribute));
        if (!nativeResults(calendar) || !hasCalendarPath(calendar)) {
          complete = false;
          continue;
        }
        Map<String, String> fields = query(calendar);
        if (EXCLUDED.contains(fields.getOrDefault("codent", ""))) {
          continue;
        }
        if (!matchesSeasonAndOrganizer(fields, season, organizer)) {
          complete = false;
          continue;
        }
        if (sharedRound(fields)) {
          seasonProven = true;
          continue;
        }
        if (fields.getOrDefault("poule", "").isBlank()) {
          complete = false;
          continue;
        }
        seasonProven = true;
        if (pack == null) {
          complete = false;
          continue;
        }
        String tour = optional(fields.get("tour"));
        String competition = Objects.requireNonNullElse(optional(fields.get("coddiv")), pack);
        String pool = fields.get("poule");
        String group = tour == null ? null : pool;
        URI full = FfvbPage.completeCalendarUrl(calendar);
        SportingObservation.Pool candidate =
            new SportingObservation.Pool(
                pack, competition, pool, tour, group, full, full, link.text());
        List<String> key = List.of(competition, tour == null ? "" : tour, pool);
        SportingObservation.Pool previous = pools.putIfAbsent(key, candidate);
        if (previous != null && !previous.equals(candidate)) {
          complete = false;
        }
      } catch (IllegalArgumentException | URISyntaxException failure) {
        complete = false;
      }
    }
    if (!seasonProven) {
      throw invalid();
    }
    return new SportingObservation.Catalog(complete, new ArrayList<>(pools.values()));
  }

  /**
   * Distinguishes a complete seasonal menu from a local calendar or round response.
   *
   * @param page bounded native page
   * @return whether this page supplies seasonal navigation rather than a child calendar
   */
  public boolean seasonal(Document page) {
    return page.selectFirst(FfvbPage.EXPORT_FORM) == null;
  }

  /**
   * Refuses a contradictory root or redirect before traversing any of its links.
   *
   * @param url actual source URL
   * @param season expected sporting year
   * @param organizer expected supported organizer
   */
  public void requireContext(URI url, String season, String organizer) {
    if (EXCLUDED.contains(organizer)) {
      throw invalid();
    }
    Map<String, String> fields = query(url);
    if ((fields.containsKey("saison") && !season.equals(fields.get("saison")))
        || (fields.containsKey("codent") && !organizer.equals(fields.get("codent")))) {
      throw invalid();
    }
  }

  /**
   * Reads submitted shared-round form controls through jsoup; neither matchday nor match-code
   * prefixes establish groups.
   *
   * @param page native page DOM
   * @param url actual round page URL
   * @param season expected sporting year
   * @param organizer expected organizer
   * @return contextual groups or null when this is not a shared-round page
   */
  private SportingObservation.Catalog round(
      Document page, URI url, String season, String organizer) {
    if (!(page.selectFirst(FfvbPage.EXPORT_FORM) instanceof FormElement form)) {
      return null;
    }
    Map<String, String> fields = new LinkedHashMap<>();
    form.formData().forEach(field -> fields.put(field.key(), field.value()));
    String division = fields.get("cal_coddiv");
    String tour = fields.get("cal_codtour");
    if (!"".equals(fields.get("cal_codpoule"))
        || division == null
        || division.isBlank()
        || tour == null
        || tour.isBlank()) {
      return null;
    }
    if (!season.equals(fields.get("cal_saison"))
        || !organizer.equals(fields.get("cal_codent"))
        || !division.equals(query(url).get("division"))
        || !tour.equals(query(url).get("tour"))) {
      throw invalid();
    }
    URI calendar;
    try {
      calendar = FfvbPage.completeCalendarUrl(url);
    } catch (URISyntaxException failure) {
      throw invalid();
    }
    List<SportingObservation.Pool> pools =
        page.select("table input[name=poule]").stream()
            .map(input -> input.attr("value"))
            .filter(value -> !value.isBlank())
            .distinct()
            .map(
                group ->
                    new SportingObservation.Pool(
                        division, division, group, tour, group, calendar, calendar, group))
            .toList();
    return new SportingObservation.Catalog(!pools.isEmpty(), pools);
  }

  /**
   * Identifies published shared rounds that require their own group-context read.
   *
   * @param page current catalog page
   * @param season selected season, never a current fallback
   * @param organizer selected organizer
   * @return exact published round URLs in this catalog scope
   */
  public List<URI> roundLinks(Document page, String season, String organizer) {
    return navigation(page).stream()
        .filter(this::hasCalendarPath)
        .filter(
            link -> {
              Map<String, String> fields = query(link);
              return matchesSeasonAndOrganizer(fields, season, organizer) && sharedRound(fields);
            })
        .map(
            link -> {
              try {
                return FfvbPage.completeCalendarUrl(link);
              } catch (URISyntaxException invalid) {
                throw invalid();
              }
            })
        .toList();
  }

  private boolean matchesSeasonAndOrganizer(
      Map<String, String> fields, String season, String organizer) {
    return season.equals(fields.get("saison")) && organizer.equals(fields.get("codent"));
  }

  private boolean sharedRound(Map<String, String> fields) {
    return !fields.getOrDefault("division", "").isBlank()
        && !fields.getOrDefault("tour", "").isBlank();
  }

  /**
   * Selects only published navigation to native frames, selectors, menus and scoped archives,
   * resolving attributes against jsoup's document base.
   *
   * @param page bounded entry HTML
   * @return deduplicated navigation, never a fabricated year or identifier
   */
  public List<URI> navigation(Document page) {
    List<URI> result = new ArrayList<>();
    for (Element link : page.select("frame[src], iframe[src], a[href], option[value]")) {
      String attribute = "value";
      if (link.hasAttr("src")) {
        attribute = "src";
      } else if (link.hasAttr("href")) {
        attribute = "href";
      }
      try {
        URI target = URI.create(link.absUrl(attribute));
        if (nativeResults(target)
            && !excludedCompetition(pack(link) + " " + link.text())
            && !EXCLUDED.contains(query(target).getOrDefault("codent", ""))) {
          result.add(target);
        }
      } catch (IllegalArgumentException failure) {
        throw invalid();
      }
    }
    return result.stream().distinct().toList();
  }

  private boolean nativeResults(URI target) {
    String path = target.getPath();
    return FfvbPage.hasOfficialResultsOrigin(target)
        && path != null
        && path.startsWith("/ffvbapp/resu/");
  }

  private boolean hasCalendarPath(URI target) {
    return target.getPath().endsWith("/" + CALENDAR_SCRIPT);
  }

  /**
   * Retains the native parent menu label rather than inferring a pack from a pool-code prefix.
   *
   * @param link published leaf
   * @return native parent heading, or null when none is published
   */
  private String pack(Element link) {
    if (link.tagName().equals("option")) {
      Element group = link.closest("optgroup");
      if (group != null && !group.attr("label").isBlank()) {
        return group.attr("label");
      }
      Element select = link.closest("select");
      Element heading = select == null ? null : select.previousElementSibling();
      if (heading != null && heading.tagName().equals("span") && !heading.text().isBlank()) {
        return heading.text();
      }
    }
    Element parent = link.parent();
    while (parent != null) {
      Element grandparent = parent.parent();
      if (parent.tagName().equals("ul")
          && grandparent != null
          && grandparent.tagName().equals("li")) {
        Element heading =
            grandparent.children().stream()
                .filter(child -> child.tagName().equals("a"))
                .findFirst()
                .orElse(null);
        if (heading != null && !heading.text().equals("Compétitions")) {
          return heading.text();
        }
      }
      parent = grandparent;
    }
    return null;
  }

  /**
   * Recognizes explicitly excluded competition labels without guessing sporting classification.
   *
   * @param label published context
   * @return whether the native label establishes an unrelated competition
   */
  private boolean excludedCompetition(String label) {
    String normalized = label.toUpperCase(Locale.ROOT);
    return normalized.contains("COUPE")
        || normalized.contains("CDF")
        || normalized.contains("BEACH")
        || normalized.contains("TEST");
  }

  /**
   * Reads native URL fields, refusing contradictory duplicates.
   *
   * @param uri published URI
   * @return exact query values
   */
  private Map<String, String> query(URI uri) {
    return ProviderQuery.fields(uri, this::invalid);
  }

  /**
   * Preserves absent optional native context.
   *
   * @param value native field
   * @return null only for unpublished context
   */
  private String optional(String value) {
    return value == null || value.isBlank() ? null : value;
  }

  /**
   * Builds a fixed structural diagnostic without source payloads.
   *
   * @return a fixed safe structural diagnostic with no provider payload
   */
  private FfvbAcquisitionException invalid() {
    return new FfvbAcquisitionException("Unqualified FFVB discovery context");
  }
}
