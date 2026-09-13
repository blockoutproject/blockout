package com.blockout.backend.sports.reference.domain;

import java.util.Locale;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Exact FFVB matching normalization, applied after the scraper's gender-specific aliases. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class TeamName {
  /**
   * Prepares the canonical alias name without accent removal or internal whitespace collapsing.
   *
   * @param canonicalName non-null name after existing alias lookup
   * @return the contextual matching-key component, never the public identity
   */
  public static String normalize(String canonicalName) {
    return canonicalName
        .toLowerCase(Locale.ROOT)
        .strip()
        .replace('’', '\'')
        .replace('-', ' ')
        .replace(".", "");
  }
}
