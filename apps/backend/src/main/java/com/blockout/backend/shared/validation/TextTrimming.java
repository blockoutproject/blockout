package com.blockout.backend.shared.validation;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Identical outer-whitespace normalization for API text fields and JavaScript form values. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class TextTrimming {
  /**
   * Removes ECMAScript whitespace and line terminators without changing interior text.
   *
   * @param value supplied text, or null for an omitted field
   * @return normalized text with omission preserved
   */
  public static String trim(String value) {
    if (value == null) return null;
    int start = 0;
    int end = value.length();
    while (start < end && isWhitespace(value.charAt(start))) start++;
    while (end > start && isWhitespace(value.charAt(end - 1))) end--;
    return value.substring(start, end);
  }

  /**
   * Recognizes the ECMAScript trim set, including nonbreaking space and BOM.
   *
   * @param character current outer UTF-16 character
   * @return whether ordinary JavaScript trim removes it
   */
  private static boolean isWhitespace(char character) {
    return Character.isSpaceChar(character)
        || (character >= '\t' && character <= '\r')
        || character == '\ufeff';
  }
}
