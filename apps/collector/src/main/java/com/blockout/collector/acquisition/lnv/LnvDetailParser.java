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
  /**
   * Extracts only reread detail facts, leaving absent unrelated fields untouched.
   *
   * @param bytes complete page acquired with timezoneoffset=0
   * @param url published match URL
   * @param match expected native match reference
   * @param competition expected championship reference
   * @return detail proposals with exact unknown versus omitted semantics
   * @throws LnvAcquisitionException for unsupported structure or conflicting match context
   */
  public SportingObservation.Facts parse(byte[] bytes, URI url, String match, String competition) {
    Map<String, String> query = LnvPage.query(url);
    if (!match.equals(query.get("mID")) || !competition.equals(query.get("ID")))
      throw LnvPage.invalid();
    Document page = LnvPage.parse(bytes, url);
    Element date = page.getElementById("Content_Main_LB_DateTime");
    if (date == null) throw LnvPage.invalid();
    SportingObservation.Facts time =
        LnvPage.time(date.text(), DateTimeFormatter.ofPattern("EEEE d MMMM uuuu", Locale.FRENCH));
    Element scores = page.getElementById("Content_Main_LB_SetsPartials");
    JsonNullable<List<SportingObservation.SetScore>> sets = null;
    if (scores != null && !scores.text().isBlank()) {
      List<SportingObservation.SetScore> parsed = new ArrayList<>();
      for (String score : scores.text().strip().split("\\s+")) {
        if (!score.matches("[0-9]{1,3}/[0-9]{1,3}")) {
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
    return SportingObservation.Facts.builder()
        .localDate(time.localDate())
        .localTime(time.localTime())
        .timeZone(time.timeZone())
        .sets(sets)
        .venueName(
            page.getElementById("Content_Main_LB_Stadium") == null
                ? null
                : JsonNullable.of(page.getElementById("Content_Main_LB_Stadium").text()))
        .build();
  }
}
