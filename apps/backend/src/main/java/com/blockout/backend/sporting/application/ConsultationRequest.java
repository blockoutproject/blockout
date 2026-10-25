package com.blockout.backend.sporting.application;

import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Immutable consultation selections shared by HTTP admission and public application reads. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ConsultationRequest {
  /** Exact immutable club/season selection; it never falls back to a different season. */
  public record ClubSeasonRequest(UUID clubId, UUID seasonId) {
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
  public record CalendarRequest(
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
