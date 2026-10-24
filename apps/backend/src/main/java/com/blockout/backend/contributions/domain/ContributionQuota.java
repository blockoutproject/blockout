package com.blockout.backend.contributions.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Ordinary quota decisions from persisted participating versions; no reset or stored counter. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ContributionQuota {
  private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

  /**
   * Resolves the Paris calendar day, including DST changes.
   *
   * @param now action instant
   * @return half-open boundaries between successive Paris midnights
   */
  public static Day dayAt(Instant now) {
    LocalDate date = now.atZone(PARIS).toLocalDate();
    return new Day(
        date.atStartOfDay(PARIS).toInstant(), date.plusDays(1).atStartOfDay(PARIS).toInstant());
  }

  /**
   * Checks ordinary limits without charging any usage.
   *
   * @param usage aggregate of immutable participating facts, independent of lifecycle state
   * @return available or the reached limit
   */
  public static Limit limit(Usage usage) {
    if (usage.versionsUsed() >= 3) return Limit.VERSION_LIMIT;
    if (usage.dailyMatchesUsed() >= 3 && !usage.matchCountedToday()) return Limit.DAILY_MATCH_LIMIT;
    return Limit.AVAILABLE;
  }

  /** Quota outcomes; moderator exemption is decided by the eligibility owner. */
  public enum Limit {
    AVAILABLE,
    VERSION_LIMIT,
    DAILY_MATCH_LIMIT
  }

  /**
   * Query boundaries, never a fixed 24-hour duration.
   *
   * @param startsAt inclusive Paris midnight
   * @param endsAt exclusive next Paris midnight
   */
  public record Day(Instant startsAt, Instant endsAt) {}

  /**
   * Bounded SQL aggregate, not a mutable balance or loaded history page.
   *
   * @param versionsUsed all participating versions for this owner/match across days
   * @param dailyMatchesUsed distinct participating matches inside the Paris day
   * @param matchCountedToday whether this match is among those daily matches
   */
  public record Usage(long versionsUsed, long dailyMatchesUsed, boolean matchCountedToday) {}
}
