package com.blockout.backend.sporting.domain;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Original team label with the comparison allowed by F02; punctuation and accents stay significant.
 *
 * @param source original attributable label
 */
public record TeamName(String source) {
  private static final Pattern SPACES = Pattern.compile("\\s+", Pattern.UNICODE_CHARACTER_CLASS);

  /**
   * Computes the deliberately limited team-name comparison key.
   *
   * @return case/space/apostrophe comparison key, without changing the original label
   */
  public String comparisonKey() {
    return SPACES
        .matcher(source.replace('’', '\'').replace('‘', '\''))
        .replaceAll(" ")
        .trim()
        .toLowerCase(Locale.ROOT);
  }
}
