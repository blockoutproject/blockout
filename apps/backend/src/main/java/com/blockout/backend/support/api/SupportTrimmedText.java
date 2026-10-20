package com.blockout.backend.support.api;

import tools.jackson.databind.util.StdConverter;

/**
 * Normalizes only the canonical title/reply-address fields during Jackson binding, before Bean
 * Validation. The whitespace set matches ECMAScript String.trim, including nonbreaking space/BOM.
 */
public final class SupportTrimmedText extends StdConverter<String, String> {
  /**
   * Removes outer whitespace in linear time without changing interior text or truncating content.
   *
   * @param value JSON string decoded by Jackson; null retains native required-field handling
   * @return normalized string, or null for the native validation boundary
   */
  @Override
  public String convert(String value) {
    if (value == null) return null;
    int start = 0;
    int end = value.length();
    while (start < end && isWhitespace(value.charAt(start))) start++;
    while (end > start && isWhitespace(value.charAt(end - 1))) end--;
    return value.substring(start, end);
  }

  /**
   * Recognizes ECMAScript whitespace and line terminators, all within the Basic Multilingual Plane.
   *
   * @param character current outer UTF-16 character
   * @return whether ordinary JavaScript trim would remove this character
   */
  private static boolean isWhitespace(char character) {
    return Character.isSpaceChar(character)
        || (character >= '\t' && character <= '\r')
        || character == '\ufeff';
  }
}
