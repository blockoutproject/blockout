package com.blockout.collector.acquisition.lnv;

import com.blockout.collector.acquisition.application.SportingObservation;
import java.net.URI;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

/**
 * Interprets the detail page's visible offset-zero clock and independently published set scores.
 */
@Component
public class LnvDetailParser {
  /** Valid independent facts and whether every published field was usable. */
  public record Read(SportingObservation.Facts facts, boolean complete) {}

  /**
   * Isolates invalid secondary fields while refusing an unrecognized global detail page.
   *
   * @param bytes bounded native detail HTML acquired with timezoneoffset=0
   * @param url actual response context
   * @param match expected match identity
   * @param competition expected championship identity
   * @return usable facts with unknown/omitted distinctions and partial-acquisition evidence
   * @throws LnvAcquisitionException when the response cannot establish the admitted match context
   */
  public Read inspect(byte[] bytes, URI url, String match, String competition) {
    Map<String, String> query = LnvPage.query(url);
    if (!match.equals(query.get("mID")) || !competition.equals(query.get("ID")))
      throw LnvPage.invalid();
    Document page = LnvPage.parse(bytes, url);
    Element date = page.getElementById("Content_Main_LB_DateTime");
    if (date == null
        && page.getElementById("Content_Main_LBL_WonSetHome") == null
        && page.getElementById("Content_Main_LB_SetsPartials") == null) throw LnvPage.invalid();
    boolean complete = true;
    SportingObservation.Facts time = SportingObservation.Facts.builder().build();
    if (date != null) {
      try {
        time =
            LnvPage.time(
                date.text(), DateTimeFormatter.ofPattern("EEEE d MMMM uuuu", Locale.FRENCH));
      } catch (LnvAcquisitionException invalidTime) {
        complete = false;
      }
    }
    JsonNullable<SportingObservation.Result> result = null;
    try {
      result = result(page);
    } catch (LnvAcquisitionException invalidResult) {
      complete = false;
    }
    Element scores = page.getElementById("Content_Main_LB_SetsPartials");
    JsonNullable<List<SportingObservation.SetScore>> sets = null;
    if (scores != null && !scores.text().isBlank()) {
      List<SportingObservation.SetScore> parsed = new ArrayList<>();
      for (String score : scores.text().strip().split("\\s+")) {
        if (!score.matches("[0-9]{1,3}/[0-9]{1,3}")) {
          complete = false;
          parsed.clear();
          break;
        }
        String[] points = score.split("/");
        parsed.add(
            new SportingObservation.SetScore(
                Integer.parseInt(points[0]), Integer.parseInt(points[1])));
      }
      if (!parsed.isEmpty()) sets = JsonNullable.of(List.copyOf(parsed));
    }
    Element venue = page.getElementById("Content_Main_LB_Stadium");
    return new Read(
        SportingObservation.Facts.builder()
            .localDate(time.localDate())
            .localTime(time.localTime())
            .timeZone(time.timeZone())
            .sets(sets)
            .result(result)
            .venueName(venue == null ? null : JsonNullable.of(venue.text()))
            .build(),
        complete);
  }

  /**
   * Reads published aggregate scores independently of optional set details.
   *
   * @param page native match detail
   * @return omitted for an unpublished/unplayed result; F02 owns native notation interpretation
   */
  private JsonNullable<SportingObservation.Result> result(Document page) {
    Element home = page.getElementById("Content_Main_LBL_WonSetHome");
    Element away = page.getElementById("Content_Main_LBL_WonSetGuest");
    return LnvPage.result(
        home == null ? "" : home.text(),
        away == null ? "" : away.text(),
        page.text().toLowerCase(Locale.FRENCH).contains("en cours"));
  }
}
