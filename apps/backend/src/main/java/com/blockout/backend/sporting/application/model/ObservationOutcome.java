package com.blockout.backend.sporting.application.model;

import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import java.net.URI;
import java.util.List;
import java.util.UUID;

/** Safe acceptance result, independent of acquisition success and HTTP status. */
public record ObservationOutcome(
    String sourceReference,
    ObservationOutcomeEnum outcome,
    UUID resourceId,
    URI reasonType,
    UUID homeTeamId,
    UUID awayTeamId,
    Boolean created) {
  /**
   * Carries an outcome without asserting creation outside calendar identification.
   *
   * @param sourceReference native reference
   * @param outcome acceptance state
   * @param resourceId resolved identity
   * @param reasonType safe refusal
   * @param homeTeamId resolved home participant
   * @param awayTeamId resolved away participant
   */
  public ObservationOutcome(
      String sourceReference,
      ObservationOutcomeEnum outcome,
      UUID resourceId,
      URI reasonType,
      UUID homeTeamId,
      UUID awayTeamId) {
    this(sourceReference, outcome, resourceId, reasonType, homeTeamId, awayTeamId, null);
  }

  /**
   * Represents a refused item without retaining submitted values or exception messages.
   *
   * @param reference attributed native reference
   * @param stale whether logical precedence refused the item
   * @return fixed safe outcome
   */
  public static ObservationOutcome refused(String reference, boolean stale) {
    return new ObservationOutcome(
        reference,
        stale ? ObservationOutcomeEnum.STALE : ObservationOutcomeEnum.REJECTED,
        null,
        URI.create(
            "urn:blockout:problem:" + (stale ? "stale-observation" : "unprocessable-content")),
        null,
        null);
  }

  /** Independently committed calendar results in contract order. */
  public record Calendar(
      List<ObservationOutcome> outcomes,
      int acceptedCount,
      int unchangedCount,
      int staleCount,
      int rejectedCount,
      boolean absenceReconciled) {
    /** Detaches per-reference outcomes. */
    public Calendar {
      outcomes = List.copyOf(outcomes);
    }
  }

  /** Catalog outcomes retain one position per input, even for identical duplicates. */
  public record Catalog(List<ObservationOutcome> outcomes, boolean absenceReconciled) {
    /** Detaches positional outcomes. */
    public Catalog {
      outcomes = List.copyOf(outcomes);
    }
  }
}
