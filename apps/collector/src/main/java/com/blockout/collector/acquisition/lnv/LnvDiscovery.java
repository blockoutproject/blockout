package com.blockout.collector.acquisition.lnv;

import com.blockout.collector.acquisition.application.SportingObservation;
import java.net.URI;
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
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

/** Follows native championship phase links; sampled ID/PID values never become configuration. */
@Component
public class LnvDiscovery {
  private static final String HOST = "lnv-web.dataproject.com";
  private static final String MATCHES = "/CompetitionMatches.aspx";

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
   * Reads championship-level evidence and phase links. For a bound traversal, dates on a root that
   * also serves a phase are checked as phase evidence so a valid sibling can still be read.
   *
   * @param bytes bounded official championship HTML
   * @param url actual final URL
   * @param competition expected championship ID
   * @return the bounded root evidence and any published season heading
   */
  public Root root(byte[] bytes, URI url, String competition) {
    return root(LnvPage.parse(bytes, url), url, competition);
  }

  /**
   * Checks the candidate response in place. A phase can disprove the selected season even when its
   * navigation omits the active phase link. Attribution from dates requires that link. The
   * published heading is retained on a mismatch for the validation result.
   *
   * @return the published or corroborated season, or null when explicit confirmation is needed
   */
  public String candidateSeason(byte[] bytes, URI url, String competition, String expectedSeason) {
    Document page = LnvPage.parse(bytes, url);
    Root root = root(page, url, competition);
    String headingSeason = root.season();
    if (headingSeason != null && !headingSeason.equals(expectedSeason)) {
      return headingSeason;
    }
    String phase = calendarQuery(url).get("PID");
    if (phase == null || phase.isBlank()) {
      return headingSeason;
    }
    Elements groups = requirePhaseGroups(page);
    groups.forEach(this::requirePhaseGroupTitle);
    String season = LnvPage.calendarSeason(groups, headingSeason, expectedSeason);
    return root.phases().stream().anyMatch(published -> published.reference().equals(phase))
        ? season
        : headingSeason;
  }

  private Root root(Document page, URI url, String competition) {
    if (!competition.equals(championshipReference(url))) {
      throw new LnvAcquisitionException("LNV championship does not match the source reference");
    }
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
    return new Root(
        championships.getFirst(), LnvPage.seasonHeading(page), phaseLinks(page, competition));
  }

  private Map<String, String> calendarQuery(URI url) {
    return HOST.equalsIgnoreCase(url.getHost()) && url.getPath().endsWith(MATCHES)
        ? LnvPage.query(url)
        : Map.of();
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
      Map<String, String> reference = calendarQuery(target);
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
    Map<String, String> context = calendarQuery(actual);
    String phase = published.reference();
    if (!competition.equals(context.get("ID")) || !phase.equals(context.get("PID"))) {
      throw new LnvAcquisitionException(
          "LNV phase response does not match its published reference");
    }

    Document page = LnvPage.parse(bytes, actual);
    Elements groups = requirePhaseGroups(page);
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
      pools.add(
          new SportingObservation.Pool(
              competition,
              competition,
              phase,
              null,
              LnvPage.phaseGroupReference(group),
              actual,
              standings,
              requirePhaseGroupTitle(group)));
    }
    return new PhaseCatalog(
        pools,
        phaseLabel(page, published),
        LnvPage.calendarSeason(groups, LnvPage.seasonHeading(page), expectedSeason));
  }

  private Elements requirePhaseGroups(Document page) {
    Elements groups = LnvPage.phaseGroups(page);
    if (groups.isEmpty()) {
      throw new LnvAcquisitionException("LNV phase has no recognizable groups");
    }
    return groups;
  }

  private String requirePhaseGroupTitle(Element group) {
    String title = LnvPage.phaseGroupTitle(group);
    if (title == null) {
      throw new LnvAcquisitionException("Unqualified LNV phase group");
    }
    return title;
  }

  private String phaseLabel(Document page, Phase published) {
    Element heading = page.selectFirst("#Content_Main_LYR_Header_ChampionshipMatches h3");
    if (heading != null && !heading.text().isBlank() && heading.text().length() <= 255) {
      return heading.text();
    }
    return "Calendrier".equalsIgnoreCase(published.label()) ? null : published.label();
  }
}
