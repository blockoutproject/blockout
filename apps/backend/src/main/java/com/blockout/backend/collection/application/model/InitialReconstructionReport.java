package com.blockout.backend.collection.application.model;

import com.blockout.backend.collection.application.model.CollectionState.ControlView;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import java.util.List;

/** Private current operator/F14 view, including unqualified roots and outstanding intent. */
public record InitialReconstructionReport(
    CollectionSeasonView season,
    List<Source> sources,
    List<ControlView> controls,
    InitialCoverage.Page coverage) {
  /** Detaches current configuration; this is a paged report, never a complete import history. */
  public InitialReconstructionReport {
    sources = List.copyOf(sources);
    controls = List.copyOf(controls);
  }
}
