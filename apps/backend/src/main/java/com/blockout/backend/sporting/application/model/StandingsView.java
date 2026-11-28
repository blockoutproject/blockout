package com.blockout.backend.sporting.application.model;

import com.blockout.backend.generated.ingestion.model.StandingsPublicationStateEnum;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.Builder;

/**
 * Latest publication evidence and independently retained usable table, for owner-controlled reads.
 */
@Builder(toBuilder = true)
public record StandingsView(
    UUID poolId,
    long cycleOrder,
    long readOrdinal,
    StandingsPublicationStateEnum publicationState,
    Instant observedAt,
    Instant providerPublishedAt,
    Instant tableObservedAt,
    Instant tablePublishedAt,
    List<String> columns,
    List<Row> rows) {
  /**
   * Detaches the current table from persistent collections.
   *
   * @param poolId known standings scope
   * @param cycleOrder backend admission order of the latest publication evidence
   * @param readOrdinal read order within that cycle
   * @param publicationState latest qualified publication state
   * @param observedAt latest publication-state observation time
   * @param providerPublishedAt supplied publication-state time, or unknown
   * @param tableObservedAt retained table observation time; null means no accepted table
   * @param tablePublishedAt retained table publication time, or unknown
   * @param columns retained official column order
   * @param rows retained official row order, including unmatched teams
   */
  public StandingsView {
    columns = List.copyOf(columns);
    rows = List.copyOf(rows);
  }

  /**
   * Reports whether a qualified table has ever been retained, including a published empty table.
   *
   * @return whether the table has its own accepted observation time
   */
  public boolean tableAvailable() {
    return tableObservedAt != null;
  }

  /** An official row and an optional exact participating identity; readers recheck visibility. */
  public record Row(
      String sourceName,
      String nativeTeamReference,
      Integer position,
      Map<String, String> statistics,
      UUID teamId) {
    /**
     * Preserves the official statistics vocabulary and missing values.
     *
     * @param sourceName official team label
     * @param nativeTeamReference optional exact provider identity
     * @param position official rank, or unknown
     * @param statistics original text with missing values left absent
     * @param teamId uniquely associated current participant at acceptance, or null
     */
    public Row {
      statistics = Map.copyOf(statistics);
    }
  }
}
