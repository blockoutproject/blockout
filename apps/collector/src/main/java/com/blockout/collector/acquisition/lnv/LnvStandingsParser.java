package com.blockout.collector.acquisition.lnv;

import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.generated.ingestion.model.StandingsPublicationStateEnum;
import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

/**
 * Reads official grouped LNV columns and source order without calculating replacement standings.
 */
@Component
public class LnvStandingsParser {
  /**
   * Interprets one qualified group independently from its calendar.
   *
   * @param bytes complete bounded standings HTML
   * @param url qualified page base
   * @param group native group container
   * @return explicit publication and source labels/statistics
   */
  public SportingObservation.Standings parse(byte[] bytes, URI url, String group) {
    Element container = LnvPage.parse(bytes, url).getElementById("Content_Main_" + group);
    if (container == null) throw LnvPage.invalid();
    Element table = container.selectFirst("table.rgMasterTable");
    if (table == null) {
      if (container.text().matches("(?is).*aucun classement.*"))
        return new SportingObservation.Standings(
            StandingsPublicationStateEnum.NOT_PUBLISHED, List.of(), List.of());
      throw LnvPage.invalid();
    }
    List<Element> headers = table.select("thead tr");
    if (headers.isEmpty()) throw LnvPage.invalid();
    List<String> groups = new ArrayList<>();
    for (Element cell : headers.getFirst().children()) {
      int span = cell.hasAttr("colspan") ? Integer.parseInt(cell.attr("colspan")) : 1;
      if (span < 1 || span > 50) throw LnvPage.invalid();
      for (int index = 0; index < span; index++) groups.add(cell.text());
    }
    List<String> columns = new ArrayList<>();
    List<Element> leaves = headers.getLast().children();
    if (groups.size() != leaves.size()) throw LnvPage.invalid();
    for (int index = 0; index < groups.size(); index++) {
      String leaf = leaves.get(index).text().strip();
      columns.add(
          headers.size() == 1 || leaf.isBlank()
              ? groups.get(index)
              : groups.get(index) + " / " + leaf);
    }
    if (columns.size() < 2 || !columns.getFirst().equals("Equipe")) throw LnvPage.invalid();
    List<SportingObservation.Standing> rows = new ArrayList<>();
    for (Element row : table.select("tbody > tr")) {
      List<Element> cells = row.children();
      if (cells.size() != columns.size()) throw LnvPage.invalid();
      Element name = cells.getFirst().selectFirst("[id=TeamName]");
      Element team = cells.getFirst().selectFirst("[id=HF_TeamID]");
      String label = name == null ? cells.getFirst().text().strip() : name.text().strip();
      if (label.isBlank()) throw LnvPage.invalid();
      Map<String, String> statistics = new LinkedHashMap<>();
      for (int index = 1; index < cells.size(); index++) {
        String value = cells.get(index).text().strip();
        if (!value.isBlank()) statistics.put(columns.get(index), value);
      }
      // A native position is only sent when explicitly printed; source order is always preserved.
      rows.add(
          new SportingObservation.Standing(
              label, team == null ? null : team.attr("value"), null, statistics));
    }
    return new SportingObservation.Standings(
        StandingsPublicationStateEnum.PUBLISHED, columns.subList(1, columns.size()), rows);
  }
}
