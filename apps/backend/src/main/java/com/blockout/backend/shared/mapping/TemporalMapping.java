package com.blockout.backend.shared.mapping;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Converts transport offsets and absolute instants without choosing a display time zone. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class TemporalMapping {
  /**
   * Represents a known instant in UTC, preserving absence.
   *
   * @param source absolute instant or null
   * @return equivalent UTC value or null
   */
  public static OffsetDateTime toDate(Instant source) {
    return source == null ? null : source.atOffset(ZoneOffset.UTC);
  }

  /**
   * Retains the absolute instant of a transport date regardless of its offset.
   *
   * @param source dated offset value or null
   * @return equivalent instant or null
   */
  public static Instant toInstant(OffsetDateTime source) {
    return source == null ? null : source.toInstant();
  }
}
