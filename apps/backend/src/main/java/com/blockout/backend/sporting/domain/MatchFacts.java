package com.blockout.backend.sporting.domain;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.regex.Pattern;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Pure compatibility decisions; official finality and overall scores are never inferred. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class MatchFacts {
  private static final Pattern SPECIAL =
      Pattern.compile("[FP]|(?:[0-9]+|[FP])/[FP]|[FP]/(?:[0-9]+|[FP])");

  /**
   * Accepts either complete numeric totals or recognized special notation, never both.
   *
   * @param home published home total, or null
   * @param away published away total, or null
   * @param special original special label, or null
   * @return whether the proposal has an interpretable representation
   */
  public static boolean usableResult(Integer home, Integer away, String special) {
    return special == null
        ? home != null && away != null && home >= 0 && away >= 0
        : home == null && away == null && SPECIAL.matcher(special).matches();
  }

  /**
   * Checks supplied played-set winners against the authoritative totals without adjudicating
   * points.
   *
   * @param home official home set total
   * @param away official away set total
   * @param sets ordered played sets, or null for unavailable detail
   * @return whether detail describes exactly the supplied overall totals
   */
  public static boolean compatibleSets(Integer home, Integer away, List<SetScore> sets) {
    if (home == null || away == null || sets == null) return false;
    int homeWins = 0;
    int awayWins = 0;
    for (SetScore set : sets) {
      if (set.home() < 0 || set.away() < 0 || set.home() == set.away()) return false;
      if (set.home() > set.away()) homeWins++;
      else awayWins++;
    }
    return homeWins == home && awayWins == away;
  }

  /**
   * Resolves only one valid source-zone offset; missing values and DST ambiguity remain unknown.
   *
   * @param date published date, possibly absent
   * @param time confirmed HH:mm time, possibly absent
   * @param zone established source zone, possibly absent
   * @return reliable instant or null
   */
  public static Instant resolveStart(LocalDate date, String time, String zone) {
    if (date == null || time == null || zone == null) return null;
    try {
      LocalDateTime local = LocalDateTime.of(date, LocalTime.parse(time));
      List<ZoneOffset> offsets = ZoneId.of(zone).getRules().getValidOffsets(local);
      return offsets.size() == 1 ? local.toInstant(offsets.getFirst()) : null;
    } catch (DateTimeException invalid) {
      return null;
    }
  }

  /** Published points in one played set; no universal winning-point threshold is imposed. */
  public record SetScore(int home, int away) {}
}
