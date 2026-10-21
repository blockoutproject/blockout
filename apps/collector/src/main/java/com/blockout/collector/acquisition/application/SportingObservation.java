package com.blockout.collector.acquisition.application;

import com.blockout.collector.generated.ingestion.model.ContextSlotKindEnum;
import com.blockout.collector.generated.ingestion.model.GeocodingOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.ResultStateEnum;
import com.blockout.collector.generated.ingestion.model.StandingsPublicationStateEnum;
import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.NoArgsConstructor;
import org.openapitools.jackson.nullable.JsonNullable;

/** Interpreted provider facts; sporting identity, acceptance and absence effects remain in F02. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SportingObservation {
  /**
   * Order allocated before acquisition; publication time exists only when supplied by the provider.
   */
  public record Context(
      UUID cycleId, long readOrdinal, Instant observedAt, Instant providerPublishedAt) {}

  /** Native participant evidence, preserving textual references and source labels. */
  public record Team(
      String sourceName, String nativeTeamReference, String clubReference, String clubSourceName) {}

  /** Published overall evidence; a special notation does not establish a winner or finality. */
  public record Result(
      ResultStateEnum state, Integer homeSets, Integer awaySets, String specialLabel) {}

  /** Actually published points, never replacement totals derived from a special result. */
  public record SetScore(int home, int away) {}

  /** Qualified document context, not a second sporting authority. */
  public record InformationSheet(String seasonLabel, String organizerReference, String matchCode) {}

  /** Nullable proposals use the library's presence type; a null wrapper means no proposal. */
  @Builder
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
      JsonNullable<URI> statisticsUrl) {}

  /** Identifiable match with its original URL provenance when available. */
  public record Match(
      String nativeMatchReference, Team home, Team away, Facts facts, URI detailUrl) {}

  /** Recognized non-match context without fabricated participants. */
  public record ContextSlot(String sourceReference, ContextSlotKindEnum kind) {}

  /** Safe attributable acquisition failure, excluding the original row. */
  public record Failure(String sourceReference, URI reasonType) {}

  /** One bounded pool observation; rejected rows never silently become absent matches. */
  public record Calendar(
      boolean complete,
      List<Match> matches,
      List<ContextSlot> contextSlots,
      List<Failure> failures) {
    /** Detaches parsed rows and prevents later scope changes. */
    public Calendar {
      matches = List.copyOf(matches);
      contextSlots = List.copyOf(contextSlots);
      failures = List.copyOf(failures);
    }
  }

  /** One published native pool identity with optional qualified acquisition URLs. */
  public record Pool(
      String packReference,
      String competitionReference,
      String poolReference,
      String tourReference,
      String groupReference,
      URI calendarUrl,
      URI standingsUrl,
      String sourceName) {}

  /** Qualified catalog presence; partial discovery cannot prove absence. */
  public record Catalog(boolean complete, List<Pool> pools) {
    /** Retains the provider's ordered identity proposals. */
    public Catalog {
      pools = List.copyOf(pools);
    }
  }

  /** Official display values, including special ratios, without locally calculated rankings. */
  public record Standing(
      String sourceName,
      String nativeTeamReference,
      Integer position,
      Map<String, String> statistics) {
    /** Detaches the selected nonpersonal statistics. */
    public Standing {
      statistics = Map.copyOf(statistics);
    }
  }

  /** Explicit publication evidence; an unreadable response cannot be represented by this value. */
  public record Standings(
      StandingsPublicationStateEnum publicationState, List<String> columns, List<Standing> rows) {
    /** Refuses contradictory absence and preserves source order. */
    public Standings {
      columns = List.copyOf(columns);
      rows = List.copyOf(rows);
      if (publicationState == StandingsPublicationStateEnum.NOT_PUBLISHED
          && (!columns.isEmpty() || !rows.isEmpty()))
        throw new IllegalArgumentException("Unpublished standings cannot contain a table");
    }
  }

  /** Permitted source-managed club proposals, independently omittable and withdrawable. */
  @Builder
  public record Club(
      String sourceName,
      JsonNullable<String> address,
      JsonNullable<String> city,
      JsonNullable<String> postalCode,
      JsonNullable<String> email,
      JsonNullable<String> phone,
      JsonNullable<String> website) {}

  /** Geocoding evidence for the backend-supplied current locality revision. */
  public record Locality(
      String localityRevision, GeocodingOutcomeEnum outcome, Double latitude, Double longitude) {}

  /**
   * F02-owned outcome and resolved identities; acquisition cannot substitute its own acceptance.
   */
  public record Outcome(
      String sourceReference,
      ObservationOutcomeEnum outcome,
      UUID resourceId,
      URI reasonType,
      UUID homeTeamId,
      UUID awayTeamId,
      Boolean created) {
    /**
     * Represents outcomes without a calendar-creation assertion.
     *
     * @param sourceReference native reference
     * @param outcome acceptance state
     * @param resourceId resolved identity
     * @param reasonType safe refusal
     * @param homeTeamId resolved home participant
     * @param awayTeamId resolved away participant
     */
    public Outcome(
        String sourceReference,
        ObservationOutcomeEnum outcome,
        UUID resourceId,
        URI reasonType,
        UUID homeTeamId,
        UUID awayTeamId) {
      this(sourceReference, outcome, resourceId, reasonType, homeTeamId, awayTeamId, null);
    }
  }

  /** Exact bounded per-match outcomes, independent from acquisition completeness. */
  public record CalendarOutcome(
      List<Outcome> outcomes,
      long acceptedCount,
      long unchangedCount,
      long staleCount,
      long rejectedCount,
      boolean absenceReconciled) {
    /** Detaches backend acceptance evidence. */
    public CalendarOutcome {
      outcomes = List.copyOf(outcomes);
    }
  }

  /** Catalog acceptance correlates compound identities by original array position. */
  public record CatalogOutcome(List<Outcome> outcomes, boolean absenceReconciled) {
    /** Retains the backend's original response order. */
    public CatalogOutcome {
      outcomes = List.copyOf(outcomes);
    }
  }
}
