package com.blockout.backend.search.application;

import com.blockout.backend.sporting.application.ConsultationViews;
import java.util.List;

/** Up to twenty current summaries and an exclusive continuation; no total or snapshot. */
public record SearchPage(List<Summary> items, SearchEngine.Position next) {
  /**
   * Detaches the currently authorized page.
   *
   * @param items up to twenty current summaries
   * @param next consumed boundary, absent only at established exhaustion
   */
  public SearchPage {
    items = List.copyOf(items);
  }

  /** Current public club context with absent city retained as absent. */
  public record Club(ConsultationViews.Identity club, String city) {}

  /** Resource-specific public view; exactly one member is supplied for the selected collection. */
  public record Summary(
      Club club, ConsultationViews.TeamSummary team, ConsultationViews.PoolSummary pool) {}
}
