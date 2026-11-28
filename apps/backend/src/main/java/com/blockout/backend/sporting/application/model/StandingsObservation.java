package com.blockout.backend.sporting.application.model;

import com.blockout.backend.generated.ingestion.model.StandingsPublicationStateEnum;
import java.util.List;
import java.util.Map;

/** A qualified source table or positive non-publication evidence, never an acquisition failure. */
public record StandingsObservation(
    MatchObservation.Context context,
    StandingsPublicationStateEnum publicationState,
    List<String> columns,
    List<Row> rows) {
  /**
   * Detaches the source order and column vocabulary.
   *
   * @param context admitted read and source attribution
   * @param publicationState qualified publication or positive absence evidence
   * @param columns official column order; empty for non-publication
   * @param rows official row order; empty for non-publication or a published empty table
   */
  public StandingsObservation {
    columns = List.copyOf(columns);
    rows = List.copyOf(rows);
  }

  /** Official row label and values; no team is created from a standings row. */
  public record Row(
      String sourceName,
      String nativeTeamReference,
      Integer position,
      Map<String, String> statistics) {
    /**
     * Retains missing statistics as missing keys rather than zeros.
     *
     * @param sourceName official team label, retained even without an identity match
     * @param nativeTeamReference optional exact provider identity
     * @param position official rank, or unknown
     * @param statistics source text keyed by declared columns, including nonnumeric ratios
     */
    public Row {
      statistics = Map.copyOf(statistics);
    }
  }
}
