package com.blockout.collector.acquisition.ffvb;

import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.generated.ingestion.model.StandingsPublicationStateEnum;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

/** Preserves official FFVB table order, labels and special display values without recalculation. */
@Component
public class FfvbStandingsParser {
  /**
   * Reads only the independently attributable table, not a nearby group's standings.
   *
   * @param page qualified native context
   * @return published table, including a positively recognized empty table
   * @throws FfvbAcquisitionException when publication or table structure is not established
   */
  public SportingObservation.Standings parse(FfvbPage page) {
    Element table = page.standings();
    if (table == null && page.qualifiedEmpty())
      return new SportingObservation.Standings(
          StandingsPublicationStateEnum.NOT_PUBLISHED, List.of(), List.of());
    if (table == null)
      throw new FfvbAcquisitionException("FFVB standings publication is not established");
    List<Element> rows = table.select("tr");
    List<String> header = FfvbPage.cells(rows.getFirst());
    Map<Integer, String> statistics = new LinkedHashMap<>();
    for (int column = 2; column < header.size(); column++) {
      String label = header.get(column);
      if (!label.isEmpty()) {
        if (statistics.containsValue(label))
          throw new FfvbAcquisitionException("Ambiguous FFVB statistic columns");
        statistics.put(column, label);
      }
    }
    List<SportingObservation.Standing> standings = new ArrayList<>();
    for (Element row : rows.subList(1, rows.size())) {
      List<String> cells = FfvbPage.cells(row);
      if (cells.stream().allMatch(String::isEmpty)) continue;
      if (cells.size() < 2 || cells.get(1).isEmpty())
        throw new FfvbAcquisitionException("Unreadable FFVB standings row");
      Integer position = null;
      String rank = cells.getFirst().replaceFirst("\\.$", "");
      if (rank.matches("[1-9][0-9]*")) {
        try {
          position = Integer.valueOf(rank);
        } catch (NumberFormatException invalid) {
          /* An unrepresentable rank stays unknown. */
        }
      }
      Map<String, String> values = new LinkedHashMap<>();
      statistics.forEach(
          (index, label) -> {
            if (index < cells.size() && !cells.get(index).isEmpty())
              values.put(label, cells.get(index));
          });
      standings.add(new SportingObservation.Standing(cells.get(1), null, position, values));
    }
    return new SportingObservation.Standings(
        StandingsPublicationStateEnum.PUBLISHED, List.copyOf(statistics.values()), standings);
  }
}
