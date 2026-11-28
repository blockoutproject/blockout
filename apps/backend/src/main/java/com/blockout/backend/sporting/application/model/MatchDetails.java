package com.blockout.backend.sporting.application.model;

import com.blockout.backend.sporting.domain.MatchFacts;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/** Current accepted enrichment and independent group attribution, without historical payloads. */
@Builder(toBuilder = true)
public record MatchDetails(
    UUID id,
    MatchObservation.Result result,
    List<MatchFacts.SetScore> sets,
    String uninterpretedResult,
    String venueName,
    String venueAddress,
    List<String> referees,
    String professionalStreamUrl,
    MatchObservation.InformationSheet informationSheet,
    String scoresheetUrl,
    String statisticsUrl,
    Instant resultObservedAt,
    Instant resultPublishedAt,
    Instant setsObservedAt,
    Instant setsPublishedAt,
    Instant venueObservedAt,
    Instant venuePublishedAt,
    Instant refereesObservedAt,
    Instant refereesPublishedAt,
    Instant streamObservedAt,
    Instant streamPublishedAt,
    Instant documentsObservedAt,
    Instant documentsPublishedAt) {
  /**
   * Detaches optional accepted collections without converting unknown values to empty lists.
   *
   * @param id known encounter identity
   * @param result accepted official result, or absent after withdrawal
   * @param sets compatible played-set detail, or unavailable
   * @param uninterpretedResult bounded unrecognized source notation for private diagnosis
   * @param venueName accepted venue label, or unknown
   * @param venueAddress accepted address, or unknown
   * @param referees accepted names; null is unknown, empty is a known empty list
   * @param professionalStreamUrl qualified official stream reference, or absent
   * @param informationSheet qualified source document locator, independent of match date
   * @param scoresheetUrl qualified scoresheet reference, or absent
   * @param statisticsUrl qualified statistics reference, or absent
   * @param resultObservedAt accepted result observation time
   * @param resultPublishedAt supplied result publication time, or unknown
   * @param setsObservedAt accepted sets observation time, independent of overall result refresh
   * @param setsPublishedAt supplied sets publication time, or unknown
   * @param venueObservedAt accepted venue observation time
   * @param venuePublishedAt supplied venue publication time, or unknown
   * @param refereesObservedAt accepted referees observation time
   * @param refereesPublishedAt supplied referees publication time, or unknown
   * @param streamObservedAt accepted stream observation time
   * @param streamPublishedAt supplied stream publication time, or unknown
   * @param documentsObservedAt accepted document-group observation time
   * @param documentsPublishedAt supplied document-group publication time, or unknown
   */
  public MatchDetails {
    sets = sets == null ? null : List.copyOf(sets);
    referees = referees == null ? null : List.copyOf(referees);
  }
}
