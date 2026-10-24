package com.blockout.backend.sporting.application;

import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.generated.mobile.model.MatchDocumentKindEnum;
import com.blockout.backend.generated.mobile.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.SportFormatEnum;
import com.blockout.backend.generated.mobile.model.SportGenderEnum;
import com.blockout.backend.generated.mobile.model.StandingsAvailabilityEnum;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.domain.MatchFacts.SetScore;
import java.net.URI;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Detached public projections containing only current effective, authorized owner values. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ConsultationViews {
  /**
   * Stable public identity; optional presentation is absent rather than source-derived fallback.
   */
  public record Identity(UUID id, String name, String shortName, String logoUrl) {}

  /** Current division presentation, without editing revision or acquisition settings. */
  public record Division(
      UUID id, String name, String logoUrl, String color, List<String> gradient) {
    /**
     * Detaches an optional complete gradient; null retains the ordinary color treatment.
     *
     * @param id current division identity
     * @param name effective division name
     * @param logoUrl backend image link, or null
     * @param color configured primary sRGB color
     * @param gradient configured three colors, or null
     */
    public Division {
      gradient = gradient == null ? null : List.copyOf(gradient);
    }
  }

  /** Available accepted classification; missing members remain unknown. */
  public record Classification(Division division, SportFormatEnum format, SportGenderEnum gender) {}

  /** Effective permitted contacts only; a deliberate absence carries no source fallback. */
  public record Contacts(
      String address, String city, String postalCode, String email, String phone, URI website) {}

  /** Reliable municipality point, independent of a match venue or official standings. */
  public record Location(double latitude, double longitude, String label) {}

  /** Common club page facts; available seasons are already ordered by the read owner. */
  public record ClubDetail(
      Identity club, Contacts contacts, Location location, List<SeasonView> seasons) {
    /**
     * Detaches viewable seasons; an empty list is a successful empty selection.
     *
     * @param club currently viewable effective identity
     * @param contacts effective permitted contacts, possibly all absent
     * @param location reliable municipality point, or null
     * @param seasons viewable canonical seasons newest first
     */
    public ClubDetail {
      seasons = List.copyOf(seasons);
    }
  }

  /** Public pool context with only known competition and phase labels. */
  public record PoolSummary(
      Identity pool,
      SeasonView season,
      Classification classification,
      String competitionName,
      String phaseName) {}

  /** Public seasonal team; professional teams may have no club or municipality. */
  public record TeamSummary(
      Identity team,
      SeasonView season,
      Classification classification,
      Identity club,
      boolean professional) {}

  /** Complete team selection for the exact requested club season. */
  public record ClubTeams(UUID seasonId, List<TeamSummary> items) {
    /**
     * Detaches the successful selection without imposing an arbitrary team cap.
     *
     * @param seasonId exact selected sporting season
     * @param items all currently viewable teams in stable order
     */
    public ClubTeams {
      items = List.copyOf(items);
    }
  }

  /** Team and current viewable participations; private following/editing state stays elsewhere. */
  public record TeamDetail(TeamSummary team, List<PoolSummary> participations) {
    /**
     * Detaches all viewable relationships from the read transaction.
     *
     * @param team currently viewable seasonal team
     * @param participations current viewable pools in stable order
     */
    public TeamDetail {
      participations = List.copyOf(participations);
    }
  }

  /** Common pool information; standings and map participants are independent reads. */
  public record PoolDetail(PoolSummary pool) {}

  /** Official row order is supplied by its containing list; no position/statistic is inferred. */
  public record StandingRow(
      String sourceName, Integer position, Identity team, Map<String, String> statistics) {
    /**
     * Preserves only stated statistic text; missing keys never become zero.
     *
     * @param sourceName published official label, even without a team link
     * @param position stated rank, or null when unknown
     * @param team current exact viewable team link, or null
     * @param statistics official display values keyed by published column
     */
    public StandingRow {
      statistics = Map.copyOf(statistics);
    }
  }

  /**
   * Official availability and independently retained table freshness, never the current read time.
   */
  public record Standings(
      UUID poolId,
      StandingsAvailabilityEnum availability,
      OffsetDateTime observedAt,
      boolean lastAttemptFailed,
      List<String> columns,
      List<StandingRow> rows) {
    /**
     * Detaches the original published column/row order without recomputing ranks.
     *
     * @param poolId viewable owner identity
     * @param availability current availability of the official table
     * @param observedAt accepted table observation time, or null without a table
     * @param lastAttemptFailed whether the latest table attempt failed
     * @param columns published column order
     * @param rows published official row order
     */
    public Standings {
      columns = List.copyOf(columns);
      rows = List.copyOf(rows);
    }
  }

  /** Current viewable participation; an absent reliable point creates no map marker. */
  public record Participant(TeamSummary team, Location location) {}

  /** Every current participant, including those without a standings row or municipality point. */
  public record Participants(UUID poolId, List<Participant> items) {
    /**
     * Detaches participants while preserving the read owner's deterministic order.
     *
     * @param poolId currently viewable pool
     * @param items viewable participants independently of official standings
     */
    public Participants {
      items = List.copyOf(items);
    }
  }

  /** Usable sporting date and optional established instant; date alone has no fabricated time. */
  public record Schedule(
      LocalDate localDate, OffsetDateTime instant, String timeZone, OffsetDateTime observedAt) {}

  /** Official result state and exact supplied totals/notation, independent of calendar category. */
  public record Result(
      ResultStateEnum state,
      Integer homeSets,
      Integer awaySets,
      String specialLabel,
      OffsetDateTime observedAt) {}

  /** Compatible played-set detail with independent accepted freshness. */
  public record Sets(OffsetDateTime observedAt, List<SetScore> items) {
    /**
     * Detaches played sets; empty means explicitly no played sets.
     *
     * @param observedAt independent accepted observation time
     * @param items compatible played sets in source order
     */
    public Sets {
      items = List.copyOf(items);
    }
  }

  /** Public dated encounter with its exact viewable relationships and evaluated category. */
  public record MatchSummary(
      UUID id,
      PoolSummary pool,
      Identity home,
      Identity away,
      Schedule schedule,
      CalendarCategoryEnum category,
      Result result) {}

  /** Nonempty pool group in stable pool order; grouping is supplied by the story projection. */
  public record PoolGroup(UUID poolId, List<MatchSummary> matches) {
    /**
     * Detaches the complete pool group without a match-count page cutoff.
     *
     * @param poolId exact viewable group identity
     * @param matches complete ordered matches for this day and pool
     */
    public PoolGroup {
      matches = List.copyOf(matches);
    }
  }

  /** Complete nonempty display day in the calendar loading zone, preserving date-only precision. */
  public record Day(LocalDate date, List<PoolGroup> pools) {
    /**
     * Detaches the complete ordered groups.
     *
     * @param date display day in the loading zone, or unchanged sporting date
     * @param pools complete nonempty groups in stable pool order
     */
    public Day {
      pools = List.copyOf(pools);
    }
  }

  /**
   * One current calendar read; continuation is an exclusive day rather than a retained snapshot.
   */
  public record Calendar(
      CalendarCategoryEnum category,
      String timeZone,
      OffsetDateTime evaluatedAt,
      List<Day> days,
      LocalDate nextDay) {
    /**
     * Detaches up to seven complete days; exhausted continuation remains absent.
     *
     * @param category evaluated upcoming/completed selection
     * @param timeZone loading zone retained through continuation
     * @param evaluatedAt single classification evaluation instant
     * @param days at most seven complete nonempty days in category order
     * @param nextDay exclusive continuation boundary, or null when exhausted
     */
    public Calendar {
      days = List.copyOf(days);
    }
  }

  /** Eligible backend document action, containing no provider locator or credentials. */
  public record Document(MatchDocumentKindEnum kind, String url) {}

  /** Exact public stream version; professional URLs have no contribution identity. */
  public record StreamLink(URI url, UUID contributionId) {
    /**
     * Requires a URL so a contributed version can never escape independently of its link.
     *
     * @param url current permitted HTTP(S) stream URL
     * @param contributionId exact contributed version, or null for a professional link
     */
    public StreamLink {
      Objects.requireNonNull(url, "Stream URL is required");
    }
  }

  /**
   * Permitted public match detail and actions, without source locators or private moderation state.
   */
  public record MatchDetail(
      MatchSummary match,
      Sets sets,
      String venueName,
      String venueAddress,
      List<String> referees,
      StreamLink stream,
      URI officialCalendarUrl,
      List<Document> documents) {
    /**
     * Detaches collections while preserving unknown versus explicitly empty referee lists.
     *
     * @param match currently viewable dated summary
     * @param sets compatible played-set details, or null when unknown
     * @param venueName permitted effective venue label, or null
     * @param venueAddress permitted effective venue address, or null
     * @param referees permitted published names; null unknown, empty known empty
     * @param stream current permitted URL/version pair, or null
     * @param officialCalendarUrl qualified official FFVB calendar link, or null
     * @param documents currently eligible backend document actions
     */
    public MatchDetail {
      referees = referees == null ? null : List.copyOf(referees);
      documents = List.copyOf(documents);
    }
  }
}
