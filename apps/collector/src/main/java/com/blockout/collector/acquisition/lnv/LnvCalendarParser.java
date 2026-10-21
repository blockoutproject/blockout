package com.blockout.collector.acquisition.lnv;

import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.generated.ingestion.model.ResultStateEnum;
import java.net.URI;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

/** Parses one published LNV group using native roster identities and independent visible facts. */
@Component
public class LnvCalendarParser {
  private static final Pattern MATCH = Pattern.compile("MatchStatistics\\.aspx\\?[^'\";\\s]+");
  private static final Pattern IMAGE = Pattern.compile("url\\([\"']?([^\"')]+)");

  /** Interpreted calendar and qualified logos keyed by native team identity, not club identity. */
  public record Read(SportingObservation.Calendar calendar, Map<String, URI> logos) {
    /** Detaches the passage's selected media references. */
    public Read {
      logos = Map.copyOf(logos);
    }
  }

  /** Native roster identity and its published image reference. */
  private record RosterTeam(String id, URI logo) {}

  /**
   * Interprets only an admitted group; malformed local rows never become absence evidence.
   *
   * @param bytes complete bounded calendar HTML with pinned offset-zero request
   * @param url actual response URL
   * @param competition expected native championship
   * @param phase expected published phase
   * @param group expected native group container
   * @return usable matches, local failures and distinct participating team logos
   */
  public Read parse(byte[] bytes, URI url, String competition, String phase, String group) {
    Map<String, String> query = LnvPage.query(url);
    if (!competition.equals(query.get("ID")) || !phase.equals(query.get("PID")))
      throw LnvPage.invalid();
    Document page = LnvPage.parse(bytes, url);
    Element container = page.getElementById("Content_Main_" + group);
    if (container == null || container.selectFirst("[id$=lbl_title]") == null)
      throw LnvPage.invalid();
    if (container.select("[id$=_MatchRow]").isEmpty()
        && !container.text().toLowerCase(Locale.FRENCH).contains("aucun match"))
      throw LnvPage.invalid();
    Map<String, RosterTeam> roster = roster(page);
    Map<String, SportingObservation.Match> matches = new LinkedHashMap<>();
    Map<String, URI> logos = new LinkedHashMap<>();
    List<SportingObservation.Failure> failures = new ArrayList<>();
    Set<String> contradictory = new LinkedHashSet<>();
    for (Element row : container.select("[id$=_MatchRow]")) {
      String reference = null;
      try {
        URI detail = detail(row, url);
        Map<String, String> context = LnvPage.query(detail);
        reference = context.get("mID");
        if (reference == null
            || !competition.equals(context.get("ID"))
            || !phase.equals(context.get("PID"))
            || !group.equals(context.get("CID"))) throw LnvPage.invalid();
        SportingObservation.Team home = team(row, "Home", roster, logos);
        SportingObservation.Team away = team(row, "Guest", roster, logos);
        String rendered = text(row, "_LB_DataOra");
        Element flag = row.parent().selectFirst("[id$=_HF_LocalMatchTimeVisible]");
        boolean qualifiedClock = flag != null && flag.attr("value").equalsIgnoreCase("true");
        // The native false flag can render a local clock even with offset zero. Preserve its date,
        // omit the unqualified clock, and let an independently qualified detail read supply it.
        SportingObservation.Facts time =
            LnvPage.time(
                qualifiedClock ? rendered : rendered.split(" - ")[0],
                DateTimeFormatter.ofPattern("dd/MM/uuuu"));
        JsonNullable<SportingObservation.Result> result = null;
        String homeSets = text(row, "_LB_SetCasa");
        String awaySets = text(row, "_LB_SetOspiti");
        if (homeSets.matches("[0-9]")
            && awaySets.matches("[0-9]")
            && !(homeSets.equals("0") && awaySets.equals("0")))
          result =
              JsonNullable.of(
                  new SportingObservation.Result(
                      row.text().toLowerCase(Locale.FRENCH).contains("en cours")
                          ? ResultStateEnum.PROVISIONAL
                          : ResultStateEnum.FINAL,
                      Integer.valueOf(homeSets),
                      Integer.valueOf(awaySets),
                      null));
        SportingObservation.Facts facts =
            SportingObservation.Facts.builder()
                .localDate(time.localDate())
                .localTime(qualifiedClock || !rendered.contains(" - ") ? time.localTime() : null)
                .timeZone(time.timeZone())
                .result(result)
                .referees(referees(row))
                .venueName(
                    text(row, "_LB_Palasport").isBlank()
                        ? null
                        : JsonNullable.of(text(row, "_LB_Palasport")))
                .build();
        SportingObservation.Match match =
            new SportingObservation.Match(reference, home, away, facts, detail);
        SportingObservation.Match previous = matches.putIfAbsent(reference, match);
        if (previous != null && !previous.equals(match)) {
          contradictory.add(reference);
          failures.add(
              new SportingObservation.Failure(
                  reference, URI.create("urn:blockout:acquisition:contradictory-match")));
        }
      } catch (RuntimeException invalid) {
        if (reference != null) contradictory.add(reference);
        failures.add(
            new SportingObservation.Failure(
                reference, URI.create("urn:blockout:acquisition:invalid-match")));
      }
    }
    contradictory.forEach(matches::remove);
    Set<String> acceptedTeams = new LinkedHashSet<>();
    matches
        .values()
        .forEach(
            match -> {
              acceptedTeams.add(match.home().nativeTeamReference());
              acceptedTeams.add(match.away().nativeTeamReference());
            });
    logos.keySet().retainAll(acceptedTeams);
    return new Read(
        new SportingObservation.Calendar(
            failures.isEmpty(), List.copyOf(matches.values()), List.of(), failures),
        logos);
  }

  /**
   * Establishes identity from explicit TeamID fields, corroborated by their published logo name.
   *
   * @param page official championship roster
   * @return unambiguous native roster associations
   */
  private Map<String, RosterTeam> roster(Document page) {
    Map<String, RosterTeam> result = new LinkedHashMap<>();
    Set<String> ambiguous = new LinkedHashSet<>();
    for (Element team : page.select("[id$=_DIV_Team]")) {
      Element id = team.selectFirst("[id$=_HF_TeamID]");
      Element image = team.selectFirst("img[src]");
      if (id == null || id.attr("value").isBlank() || image == null) continue;
      try {
        URI logo = URI.create(image.absUrl("src"));
        if (logo.getPath() == null) continue;
        String file = logo.getPath().substring(logo.getPath().lastIndexOf('/') + 1);
        RosterTeam item = new RosterTeam(id.attr("value"), logo);
        RosterTeam previous = result.putIfAbsent(file, item);
        if (previous != null && !previous.equals(item)) ambiguous.add(file);
      } catch (IllegalArgumentException invalidImage) {
        // This roster entry cannot identify a participant; unrelated matches remain usable.
      }
    }
    ambiguous.forEach(result::remove);
    return result;
  }

  /**
   * Keeps only explicitly printed referees; absent fields are not a withdrawal.
   *
   * @param row native match row
   * @return published names or an omitted proposal
   */
  private JsonNullable<List<String>> referees(Element row) {
    List<String> names =
        List.of(text(row, "_LB_Arbitro1"), text(row, "_LB_Arbitro2")).stream()
            .filter(name -> !name.isBlank())
            .distinct()
            .toList();
    return names.isEmpty() ? null : JsonNullable.of(names);
  }

  /**
   * Resolves a participant through its published logo and explicit roster TeamID, never its label.
   *
   * @param row one native match
   * @param side Home or Guest native field suffix
   * @param roster qualified native team associations
   * @param logos selected team's original published image URL
   * @return clubless professional participant
   */
  private SportingObservation.Team team(
      Element row, String side, Map<String, RosterTeam> roster, Map<String, URI> logos) {
    Element logo = row.selectFirst("[id$=_Logo_" + side + "]");
    if (logo == null) throw LnvPage.invalid();
    Matcher matcher = IMAGE.matcher(logo.attr("style"));
    if (!matcher.find()) throw LnvPage.invalid();
    URI uri = URI.create(matcher.group(1));
    if (!"images.dataproject.com".equalsIgnoreCase(uri.getHost())
        || !uri.getPath().startsWith("/lnv/TeamLogo/")) throw LnvPage.invalid();
    RosterTeam identity = roster.get(uri.getPath().substring(uri.getPath().lastIndexOf('/') + 1));
    if (identity == null) throw LnvPage.invalid();
    if (!"images.dataproject.com".equalsIgnoreCase(identity.logo().getHost())
        || !identity.logo().getPath().startsWith("/lnv/TeamLogo/")) throw LnvPage.invalid();
    String label = text(row, side.equals("Home") ? "_Label2" : "_Label4");
    if (label.isBlank()) label = text(row, "_LBL_" + side + "TeamName");
    if (label.isBlank()) throw LnvPage.invalid();
    logos.put(identity.id(), identity.logo());
    return new SportingObservation.Team(label, identity.id(), null, null);
  }

  /**
   * Extracts a literal published navigation URL without executing JavaScript.
   *
   * @param row native match row
   * @param base current calendar URL
   * @return uniquely published detail context
   */
  private URI detail(Element row, URI base) {
    Set<URI> references = new LinkedHashSet<>();
    for (Element element : row.select("[onclick], a[href]")) {
      Matcher match =
          MATCH.matcher(element.hasAttr("href") ? element.attr("href") : element.attr("onclick"));
      if (match.find()) references.add(base.resolve(match.group()));
    }
    if (references.size() != 1) throw LnvPage.invalid();
    return references.iterator().next();
  }

  /**
   * @param row native context
   * @param suffix exact field suffix
   * @return visible text or absence
   */
  private String text(Element row, String suffix) {
    Element value = row.selectFirst("[id$=" + suffix + "]");
    return value == null ? "" : value.text().strip();
  }
}
