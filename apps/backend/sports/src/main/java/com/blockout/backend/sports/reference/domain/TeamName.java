package com.blockout.backend.sports.reference.domain;

import java.util.Locale;

/** Exact FFVB matching normalization, applied after the scraper's gender-specific aliases. */
public final class TeamName {
  /** Prevents construction of the stateless provider-name rule. */
  private TeamName() {}

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
