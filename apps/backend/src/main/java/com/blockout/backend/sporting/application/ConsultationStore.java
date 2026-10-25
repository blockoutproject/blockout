package com.blockout.backend.sporting.application;

import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.SportingReadService;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Story-owned cohesive public projections inside the sporting module. Implementations must use
 * {@link SportingReadService}'s current identity/visibility and effective owner values within their
 * read transaction, including every relationship. No account or Pro state is an input. F12 admits
 * ordinary HTTP/bypass before this boundary; bypass never relaxes sporting visibility. Empty means
 * unknown or currently hidden, while dependency failures propagate rather than becoming empty data.
 * Calendar, standings, participant and document operations are added by their owning story tasks.
 */
public interface ConsultationStore {
  /**
   * Reads current public club identity without contacts, locality or season collections.
   *
   * @param clubId stable club identity
   * @return current permitted identity, or empty when unavailable
   */
  Optional<ConsultationViews.Identity> clubIdentity(UUID clubId);

  /**
   * Reads current effective permitted club facts and available seasons for this exact identity.
   *
   * @param clubId stable club identity from navigation
   * @return current public facts, or empty when unavailable
   */
  Optional<ConsultationViews.ClubDetail> club(UUID clubId);

  /**
   * Reads all viewable teams in the exact club season; an unknown season is unavailable.
   *
   * @param request exact club and season selected together
   * @return all viewable teams, possibly an empty collection; empty Optional for unavailable scope
   */
  Optional<ConsultationViews.ClubTeams> clubTeams(ClubSeasonRequest request);

  /**
   * Reads the current seasonal team summary without constructing participation summaries.
   *
   * @param teamId stable seasonal team identity
   * @return current permitted summary, including an optional club, or empty when unavailable
   */
  Optional<ConsultationViews.TeamSummary> teamSummary(UUID teamId);

  /**
   * Reads a viewable seasonal team and its current viewable participations, including clubless
   * teams.
   *
   * @param teamId stable seasonal team identity
   * @return current team and visible relationships, or empty when unavailable
   */
  Optional<ConsultationViews.TeamDetail> team(UUID teamId);

  /**
   * Reads current viewable pool context without requiring a published table.
   *
   * @param poolId stable contextual pool identity
   * @return current pool context, or empty when unavailable
   */
  Optional<ConsultationViews.PoolDetail> pool(UUID poolId);

  /**
   * Reads a currently viewable dated match with permitted effective facts and eligible actions.
   *
   * @param matchId exact encounter identity, with no substitution
   * @return current permitted dated match, or empty when unavailable
   */
  Optional<ConsultationViews.MatchDetail> match(UUID matchId);

  /** Exact immutable club/season selection; it never falls back to a different season. */
  record ClubSeasonRequest(UUID clubId, UUID seasonId) {
    /**
     * Requires both identities before starting a story projection.
     *
     * @param clubId exact club identity
     * @param seasonId explicitly selected sporting season
     */
    public ClubSeasonRequest {
      Objects.requireNonNull(clubId, "Club is required");
      Objects.requireNonNull(seasonId, "Season is required");
    }
  }

  /** Exactly one sporting calendar scope, its grouping context and exclusive continuation day. */
  record CalendarRequest(
      Kind kind,
      UUID id,
      UUID seasonId,
      CalendarCategoryEnum category,
      ZoneId timeZone,
      LocalDate nextDay) {
    /**
     * Rejects incoherent selectors; a club requires a season while team/pool forbid it.
     *
     * @param kind club, team or pool; match cannot select a calendar
     * @param id exact selected resource
     * @param seasonId required for a club, absent otherwise
     * @param category exact upcoming/completed selection
     * @param timeZone established loading zone for the whole traversal
     * @param nextDay optional exclusive display-day continuation
     * @throws IllegalArgumentException when the selector and season disagree
     */
    public CalendarRequest {
      Objects.requireNonNull(kind, "Resource kind is required");
      Objects.requireNonNull(id, "Resource identity is required");
      Objects.requireNonNull(category, "Category is required");
      Objects.requireNonNull(timeZone, "Grouping zone is required");
      if (kind == Kind.MATCH || (kind == Kind.CLUB) != (seasonId != null))
        throw new IllegalArgumentException("Calendar requires a club/season, team or pool");
    }
  }
}
