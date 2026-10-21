package com.blockout.collector.acquisition.ffvb;

import com.blockout.collector.acquisition.application.FfvbAcquisitionException;
import com.blockout.collector.acquisition.application.SportingObservation;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.hc.core5.http.NameValuePair;
import org.apache.hc.core5.net.URIBuilder;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

/**
 * Interprets published seasonal FFVB navigation without inferred inventories or code partitions.
 */
@Component
public class FfvbDiscovery {
  private static final Set<String> EXCLUDED =
      Set.of("LIGU", "LIGY", "LIMART", "LIMY", "LIRE", "AALNV");
  private static final Charset ENCODING = Charset.forName("windows-1252");

  /**
   * Reads a complete native organizer menu or national selector, preserving partial-link evidence.
   *
   * @param bytes complete bounded HTML body
   * @param url response context
   * @param season expected canonical season label
   * @param organizer expected supported organizer
   * @return contextual references; incomplete input cannot prove absence
   * @throws FfvbAcquisitionException for unsupported structure or contradictory root scope
   */
  public SportingObservation.Catalog parse(byte[] bytes, URI url, String season, String organizer) {
    requireContext(url, season, organizer);
    Document page = Jsoup.parse(new String(bytes, ENCODING), url.toString());
    SportingObservation.Catalog round = round(page, url, season, organizer);
    if (round != null) return round;
    Element menu = page.selectFirst("#menu");
    List<Element> links =
        menu == null ? page.select("select option[value]") : menu.select("a[href]");
    boolean recognized = menu != null && menu.text().contains("Compétitions") || !links.isEmpty();
    if (!recognized) throw invalid();
    boolean complete = true;
    boolean seasonProven =
        page.select("select[name=saison] option[selected], input[name=saison]").stream()
            .anyMatch(element -> season.equals(element.attr("value")));
    Map<String, SportingObservation.Pool> pools = new LinkedHashMap<>();
    for (Element link : links) {
      String value = link.hasAttr("href") ? link.attr("href") : link.attr("value");
      if (!value.contains("vbspo_calendrier.php")) continue;
      String pack = pack(link);
      if (excludedCompetition(pack + " " + link.text())) continue;
      try {
        URI calendar = url.resolve(value);
        Map<String, String> fields = query(calendar);
        if (EXCLUDED.contains(fields.getOrDefault("codent", ""))) continue;
        if (season.equals(fields.get("saison"))
            && organizer.equals(fields.get("codent"))
            && !fields.getOrDefault("division", "").isBlank()
            && !fields.getOrDefault("tour", "").isBlank()) {
          seasonProven = true;
          continue;
        }
        if (!season.equals(fields.get("saison"))
            || !organizer.equals(fields.get("codent"))
            || fields.getOrDefault("poule", "").isBlank()) {
          complete = false;
          continue;
        }
        seasonProven = true;
        String tour = optional(fields.get("tour"));
        String competition = optional(fields.get("coddiv"));
        if (competition == null) competition = pack;
        if (pack == null || competition == null) {
          complete = false;
          continue;
        }
        String pool = fields.get("poule");
        String group = tour == null ? null : pool;
        URI full = new URIBuilder(calendar).setParameter("calend", "COMPLET").build();
        SportingObservation.Pool candidate =
            new SportingObservation.Pool(
                pack, competition, pool, tour, group, full, full, link.text());
        String key =
            List.of(competition == null ? "" : competition, tour == null ? "" : tour, pool)
                .toString();
        SportingObservation.Pool previous = pools.putIfAbsent(key, candidate);
        if (previous != null && !previous.equals(candidate)) complete = false;
      } catch (IllegalArgumentException | URISyntaxException failure) {
        complete = false;
      }
    }
    if (!seasonProven) throw invalid();
    return new SportingObservation.Catalog(complete, new ArrayList<>(pools.values()));
  }

  /**
   * Refuses a contradictory root or redirect before traversing any of its links.
   *
   * @param url actual source URL
   * @param season expected sporting year
   * @param organizer expected supported organizer
   */
  public void requireContext(URI url, String season, String organizer) {
    if (EXCLUDED.contains(organizer)) throw invalid();
    Map<String, String> fields = query(url);
    if ((fields.containsKey("saison") && !season.equals(fields.get("saison")))
        || (fields.containsKey("codent") && !organizer.equals(fields.get("codent"))))
      throw invalid();
  }

  /**
   * Reads actual shared-round group fields; neither matchday nor match-code prefixes establish
   * groups.
   *
   * @param page native page DOM
   * @param url actual round page URL
   * @param season expected sporting year
   * @param organizer expected organizer
   * @return contextual groups or null when this is not a shared-round page
   */
  private SportingObservation.Catalog round(
      Document page, URI url, String season, String organizer) {
    Element form = page.selectFirst("form[action$=vbspo_calendrier_export.php]");
    if (form == null) return null;
    Map<String, String> fields = new LinkedHashMap<>();
    form.select("input[name]")
        .forEach(input -> fields.put(input.attr("name"), input.attr("value")));
    String division = fields.get("cal_coddiv");
    String tour = fields.get("cal_codtour");
    if (!"".equals(fields.get("cal_codpoule"))
        || division == null
        || division.isBlank()
        || tour == null
        || tour.isBlank()) return null;
    if (!season.equals(fields.get("cal_saison"))
        || !organizer.equals(fields.get("cal_codent"))
        || !division.equals(query(url).get("division"))
        || !tour.equals(query(url).get("tour"))) throw invalid();
    URI calendar;
    try {
      calendar = new URIBuilder(url).setParameter("calend", "COMPLET").build();
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
   * @param bytes current catalog page
   * @param url response base
   * @param season selected season, never a current fallback
   * @param organizer selected organizer
   * @return exact published round URLs in this catalog scope
   */
  public List<URI> roundLinks(byte[] bytes, URI url, String season, String organizer) {
    return navigation(bytes, url).stream()
        .filter(
            link -> {
              Map<String, String> fields = query(link);
              return season.equals(fields.get("saison"))
                  && organizer.equals(fields.get("codent"))
                  && !fields.getOrDefault("division", "").isBlank()
                  && !fields.getOrDefault("tour", "").isBlank();
            })
        .toList();
  }

  /**
   * Selects only published navigation to native frames, selectors, menus and scoped archives.
   *
   * @param bytes bounded entry HTML
   * @param url entry base
   * @return deduplicated navigation, never a fabricated year or identifier
   */
  public List<URI> navigation(byte[] bytes, URI url) {
    Document page = Jsoup.parse(new String(bytes, ENCODING), url.toString());
    List<URI> result = new ArrayList<>();
    for (Element link : page.select("frame[src], iframe[src], a[href], option[value]")) {
      String attribute = link.hasAttr("src") ? "src" : link.hasAttr("href") ? "href" : "value";
      try {
        URI target = url.resolve(link.attr(attribute));
        String path = target.getPath();
        if ("www.ffvbbeach.org".equalsIgnoreCase(target.getHost())
            && path != null
            && path.startsWith("/ffvbapp/resu/")
            && !excludedCompetition(link.text())
            && !EXCLUDED.contains(query(target).getOrDefault("codent", ""))) result.add(target);
      } catch (IllegalArgumentException failure) {
        throw invalid();
      }
    }
    return result.stream().distinct().toList();
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
      if (group != null && !group.attr("label").isBlank()) return group.attr("label");
      Element select = link.closest("select");
      Element heading = select == null ? null : select.previousElementSibling();
      if (heading != null && heading.tagName().equals("span") && !heading.text().isBlank())
        return heading.text();
    }
    Element parent = link.parent();
    while (parent != null) {
      if (parent.tagName().equals("ul")
          && parent.parent() != null
          && parent.parent().tagName().equals("li")) {
        Element heading =
            parent.parent().children().stream()
                .filter(child -> child.tagName().equals("a"))
                .findFirst()
                .orElse(null);
        if (heading != null && !heading.text().equals("Compétitions")) return heading.text();
      }
      parent = parent.parent();
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
    Map<String, String> fields = new LinkedHashMap<>();
    for (NameValuePair field : new URIBuilder(uri).getQueryParams()) {
      String previous = fields.putIfAbsent(field.getName(), field.getValue());
      if (previous != null && !previous.equals(field.getValue())) throw invalid();
    }
    return fields;
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
   * @return a fixed safe structural diagnostic with no provider payload
   */
  private FfvbAcquisitionException invalid() {
    return new FfvbAcquisitionException("Unqualified FFVB discovery context");
  }
}
