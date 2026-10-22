package com.blockout.backend.support.api;

import com.blockout.backend.shared.validation.TextTrimming;
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
    return TextTrimming.trim(value);
  }
}
