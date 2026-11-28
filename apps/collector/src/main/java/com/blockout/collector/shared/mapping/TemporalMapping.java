package com.blockout.collector.shared.mapping;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Represents absolute instants in transport requests. */
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
}
