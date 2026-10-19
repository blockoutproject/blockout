package com.blockout.backend.sporting.application.model;

import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import java.net.URI;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * Immutable submitted match facts, separate from accepted sporting state. JsonNullable retains the
 * library's undefined/null/value distinction; use cases own eligibility and field decisions.
 *
 * @param matchId existing match addressed by the request
 * @param context submitted cycle and freshness, still requiring current owner authorization
 * @param facts independent proposals, without inferred defaults
 */
public record MatchObservation(UUID matchId, Context context, Facts facts) {
  /**
   * Submitted attribution; publication time never replaces logical observation order.
   *
   * @param cycleId backend-owned cycle to resolve and authorize
   * @param readOrdinal ordinal allocated before the provider read
   * @param observedAt completion instant of the read
   * @param providerPublishedAt supplied publication instant, or null when unknown
   */
  public record Context(
      UUID cycleId,
      long readOrdinal,
      OffsetDateTime observedAt,
      OffsetDateTime providerPublishedAt) {}

  /**
   * Independent proposals rather than a replacement of accepted facts. Undefined preserves a fact;
   * explicit null retains its field-specific withdrawal meaning, distinct from an empty list.
   */
  public record Facts(
      JsonNullable<LocalDate> localDate,
      JsonNullable<String> localTime,
      String timeZone,
      JsonNullable<Result> result,
      JsonNullable<List<SetScore>> sets,
      JsonNullable<String> venueName,
      JsonNullable<String> venueAddress,
      JsonNullable<List<String>> referees,
      JsonNullable<URI> professionalStreamUrl,
      JsonNullable<InformationSheet> informationSheet,
      JsonNullable<URI> scoresheetUrl,
      JsonNullable<URI> statisticsUrl) {
    /**
     * Copies supplied lists while retaining undefined, null and empty as distinct inputs.
     *
     * @param localDate published local date
     * @param localTime confirmed local time
     * @param timeZone supplied source zone, or null when omitted
     * @param result overall result proposal
     * @param sets ordered played-set proposals
     * @param venueName supplied venue label
     * @param venueAddress supplied venue address
     * @param referees supplied referee labels
     * @param professionalStreamUrl qualified professional stream reference
     * @param informationSheet qualified information-sheet locator
     * @param scoresheetUrl qualified professional scoresheet reference
     * @param statisticsUrl qualified professional statistics reference
     */
    public Facts {
      sets = sets.map(values -> values == null ? null : List.copyOf(values));
      referees = referees.map(values -> values == null ? null : List.copyOf(values));
    }
  }

  /**
   * Source result before sporting compatibility and transition decisions.
   *
   * @param state exact contract-owned finality
   * @param homeSets supplied home total, or null for nonnumeric notation
   * @param awaySets supplied away total, or null for nonnumeric notation
   * @param specialLabel recognized notation, independently of finality
   */
  public record Result(
      ResultStateEnum state, Integer homeSets, Integer awaySets, String specialLabel) {}

  /**
   * One interpreted set in source order; it does not establish a match result.
   *
   * @param home home points
   * @param away away points
   */
  public record SetScore(int home, int away) {}

  /**
   * Qualified information-sheet locator, independent of match identity and accepted result.
   *
   * @param seasonLabel provider season label
   * @param organizerReference qualified organizer reference
   * @param matchCode stable source document code
   */
  public record InformationSheet(String seasonLabel, String organizerReference, String matchCode) {}
}
