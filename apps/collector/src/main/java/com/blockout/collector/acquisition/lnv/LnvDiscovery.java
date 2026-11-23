package com.blockout.collector.acquisition.lnv;

import com.blockout.collector.acquisition.application.SportingObservation;
import java.net.URI;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

/** Follows native championship phase links; sampled ID/PID values never become configuration. */
@Component
public class LnvDiscovery {
  private static final String HOST = "lnv-web.dataproject.com";
  private static final String MATCHES = "/CompetitionMatches.aspx";
  private static final DateTimeFormatter MATCH_DATE = DateTimeFormatter.ofPattern("dd/MM/uuuu");

  /** The covered LNV championships, including their published historical labels. */
  public enum Championship {
    WOMEN_FIRST("saforelle volstar", "saforelle power 6", "ligue a féminine"),
    MEN_FIRST("alterna volstar", "marmara spikeligue", "ligue a masculine"),
    MEN_SECOND("volstar masculine 2", "ligue b masculine");

    private final List<String> labels;

    Championship(String... labels) {
      this.labels = List.of(labels);
    }
  }

  /** Qualified championship root with a distinct, published set of phase references. */
  public record Root(Championship championship, String season, List<Phase> phases) {}

  /** A qualified native navigation target and its unambiguous visible name, when present. */
  public record Phase(URI url, String reference, String label) {}

  /** Published group structure and phase name with independently established season evidence. */
  public record PhaseCatalog(List<SportingObservation.Pool> pools, String label, String season) {}

  /** The native championship ID in a supported DataProject reference, or null if absent. */
  public String championshipReference(URI url) {
    return HOST.equalsIgnoreCase(url.getHost()) ? LnvPage.query(url).get("ID") : null;
  }

  /**
   * Reads the championship, season evidence and phase inventory from one native root.
   *
   * @param bytes bounded official championship HTML
   * @param url actual final URL
   * @param competition expected championship ID
   * @return the bounded root evidence; season is absent only when the page omits it
   */
  public Root root(byte[] bytes, URI url, String competition) {
    if (!competition.equals(championshipReference(url))) {
      throw new LnvAcquisitionException("LNV championship does not match the source reference");
    }
    Document page = LnvPage.parse(bytes, url);
    String title =
        page.select("title, .CompetitionDescription_Header, [id$=lbl_title]")
            .text()
            .toLowerCase(Locale.ROOT);
    List<Championship> championships =
        Arrays.stream(Championship.values())
            .filter(championship -> championship.labels.stream().anyMatch(title::contains))
            .toList();
    if (championships.size() != 1) {
      throw new LnvAcquisitionException("Missing or contradictory LNV championship heading");
    }
    return new Root(championships.getFirst(), LnvPage.season(page), phaseLinks(page, competition));
  }

  private List<Phase> phaseLinks(Document page, String competition) {
    Map<URI, String> links = new LinkedHashMap<>();
    Map<String, Set<String>> labels = new HashMap<>();
    for (Element link : page.select("a[href]")) {
      URI target;
      try {
        target = URI.create(link.absUrl("href"));
      } catch (IllegalArgumentException failure) {
        throw LnvPage.invalid();
      }
      if (HOST.equalsIgnoreCase(target.getHost()) && target.getPath().endsWith(MATCHES)) {
        Map<String, String> reference = LnvPage.query(target);
        if (competition.equals(reference.get("ID")) && reference.containsKey("PID")) {
          String phase = reference.get("PID");
          if (phase == null || phase.isBlank()) {
            throw new LnvAcquisitionException("LNV phase link has no phase identity");
          }
          links.putIfAbsent(target, phase);
          String label = link.text();
          if (!label.isBlank() && label.length() <= 255) {
            labels.computeIfAbsent(phase, ignored -> new HashSet<>()).add(label);
          }
        }
      }
    }
    if (links.isEmpty()) {
      throw new LnvAcquisitionException("No published LNV phase references");
    }
    return links.entrySet().stream()
        .map(
            entry -> {
              Set<String> names = labels.getOrDefault(entry.getValue(), Set.of());
              String label = names.size() == 1 ? names.iterator().next() : null;
              return new Phase(entry.getKey(), entry.getValue(), label);
            })
        .toList();
  }

  /**
   * Interprets the groups from a phase published by the qualified root. A phase can inherit the
   * root's season evidence, but contradictory season or redirect context refuses the whole phase.
   *
   * @param bytes bounded phase page HTML
   * @param actual final response URL
   * @param competition qualified root championship
   * @param published phase qualified by that root
   * @param expectedSeason established championship season, or null during first attribution
   * @return qualified groups and available phase evidence
   */
  public PhaseCatalog phaseCatalog(
      byte[] bytes, URI actual, String competition, Phase published, String expectedSeason) {
    Map<String, String> context = LnvPage.query(actual);
    String phase = published.reference();
    if (!HOST.equalsIgnoreCase(actual.getHost())
        || !actual.getPath().endsWith(MATCHES)
        || !competition.equals(context.get("ID"))
        || !phase.equals(context.get("PID"))) {
      throw new LnvAcquisitionException(
          "LNV phase response does not match its published reference");
    }

    Document page = LnvPage.parse(bytes, actual);
    List<Element> groups = page.select("div.rmpView[id^=Content_Main_]");
    if (groups.isEmpty()) {
      throw new LnvAcquisitionException("LNV phase has no recognizable groups");
    }
    URI standings = null;
    for (Element link : page.select("a[href*=CompetitionStandings.aspx]")) {
      URI candidate = URI.create(link.absUrl("href"));
      Map<String, String> reference = LnvPage.query(candidate);
      if (HOST.equalsIgnoreCase(candidate.getHost())
          && competition.equals(reference.get("ID"))
          && phase.equals(reference.getOrDefault("PID", phase))) {
        standings = candidate;
      }
    }

    List<SportingObservation.Pool> pools = new ArrayList<>();
    for (Element group : groups) {
      String id = group.id().substring("Content_Main_".length());
      Element title = group.selectFirst("[id$=lbl_title]");
      if (!id.matches("[0-9]+") || title == null || title.text().isBlank()) {
        throw new LnvAcquisitionException("Unqualified LNV phase group");
      }
      pools.add(
          new SportingObservation.Pool(
              competition, competition, phase, null, id, actual, standings, title.text()));
    }
    return new PhaseCatalog(
        pools, phaseLabel(page, published), phaseSeason(page, groups, expectedSeason));
  }

  private String phaseLabel(Document page, Phase published) {
    Element heading = page.selectFirst("#Content_Main_LYR_Header_ChampionshipMatches h3");
    if (heading != null && !heading.text().isBlank() && heading.text().length() <= 255) {
      return heading.text();
    }
    return "Calendrier".equalsIgnoreCase(published.label()) ? null : published.label();
  }

  /** A phase spanning both civil years can establish the season through published match dates. */
  private String phaseSeason(Document page, List<Element> groups, String expectedSeason) {
    String explicitSeason = LnvPage.season(page);
    if (explicitSeason != null
        && expectedSeason != null
        && !expectedSeason.equals(explicitSeason)) {
      throw new LnvAcquisitionException("LNV phase belongs to a different season");
    }

    String season = explicitSeason == null ? expectedSeason : explicitSeason;
    Set<Integer> calendarYears = new HashSet<>();
    for (Element group : groups) {
      for (Element dateField : group.select("[id$=_MatchRow] [id$=_LB_DataOra]")) {
        LocalDate date = publishedDate(dateField.text());
        if (date == null) {
          continue;
        }
        int startYear =
            date.getMonthValue() >= Month.JULY.getValue() ? date.getYear() : date.getYear() - 1;
        String matchSeason = startYear + "/" + (startYear + 1);
        if (season != null && !season.equals(matchSeason)) {
          throw new LnvAcquisitionException("LNV phase match dates contradict the season");
        }
        season = matchSeason;
        calendarYears.add(date.getYear());
      }
    }
    return explicitSeason != null || calendarYears.size() == 2 ? season : null;
  }

  private LocalDate publishedDate(String rendered) {
    if (rendered.isBlank()) {
      return null;
    }
    try {
      return LnvPage.date(rendered.split(" - ", 2)[0], MATCH_DATE);
    } catch (LnvAcquisitionException invalidDate) {
      // Calendar parsing reports malformed rows independently. They supply no seasonal evidence.
      return null;
    }
  }
}
