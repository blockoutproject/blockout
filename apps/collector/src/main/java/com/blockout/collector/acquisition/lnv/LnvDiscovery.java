package com.blockout.collector.acquisition.lnv;

import com.blockout.collector.acquisition.application.SportingObservation;
import java.net.URI;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
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
  public record Root(Championship championship, String season, List<URI> phases) {}

  /**
   * Verifies the expected supported championship and returns only explicit seasonal evidence.
   *
   * @param bytes complete candidate HTML
   * @param url final response URL after supported redirects
   * @param competition expected native championship reference
   * @return published season label, or null when explicit operator confirmation is needed
   */
  public String qualify(byte[] bytes, URI url, String competition) {
    return root(bytes, url, competition).season();
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
    if (!HOST.equalsIgnoreCase(url.getHost())
        || !competition.equals(LnvPage.query(url).get("ID"))) {
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

  private List<URI> phaseLinks(Document page, String competition) {
    List<URI> result = new ArrayList<>();
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
          result.add(target);
        }
      }
    }
    if (result.isEmpty()) {
      throw new LnvAcquisitionException("No published LNV phase references");
    }
    return result.stream().distinct().toList();
  }

  /**
   * Interprets the groups from a phase published by the qualified root. A phase can inherit the
   * root's season evidence, but contradictory season or redirect context refuses the whole phase.
   *
   * @param bytes bounded phase page HTML
   * @param actual final response URL
   * @param published exact phase link from the root
   * @param season expected root season
   * @return groups available from this independently qualified phase
   */
  public List<SportingObservation.Pool> phasePools(
      byte[] bytes, URI actual, URI published, String season) {
    Map<String, String> context = LnvPage.query(actual);
    Map<String, String> expected = LnvPage.query(published);
    String competition = expected.get("ID");
    String phase = expected.get("PID");
    if (!HOST.equalsIgnoreCase(actual.getHost())
        || !actual.getPath().endsWith(MATCHES)
        || !competition.equals(context.get("ID"))
        || !phase.equals(context.get("PID"))) {
      throw new LnvAcquisitionException(
          "LNV phase response does not match its published reference");
    }

    Document page = LnvPage.parse(bytes, actual);
    String observedSeason = LnvPage.season(page);
    if (observedSeason != null && !season.equals(observedSeason)) {
      throw new LnvAcquisitionException("LNV phase belongs to a different season");
    }
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
    return pools;
  }
}
