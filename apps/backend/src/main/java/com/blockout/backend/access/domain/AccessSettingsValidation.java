package com.blockout.backend.access.domain;

import java.math.BigInteger;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Pure settings invariants, independent of persistence and transport coercion. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class AccessSettingsValidation {
  /** Largest integer exactly representable by the active JavaScript consumer. */
  public static final long MAX_REVISION = 9007199254740991L;

  private static final Pattern VERSION =
      Pattern.compile("(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)");

  /**
   * Requires an exactly representable, nonnegative JSON/JavaScript revision.
   *
   * @param revision submitted or stored group revision
   * @throws IllegalArgumentException for an unsafe or negative integer
   */
  public static void revision(long revision) {
    if (revision < 0 || revision > MAX_REVISION)
      throw new IllegalArgumentException("Invalid revision");
  }

  /**
   * Trims Unicode spacing and requires usable text when the field is mandatory.
   *
   * @param value supplied plain text; null is meaningful only for an optional message
   * @param required whether null must be refused
   * @return normalized text, or the allowed absent optional message
   * @throws IllegalArgumentException for missing required or blank text
   */
  public static String text(String value, boolean required) {
    if (value == null) {
      if (required) throw new IllegalArgumentException("Missing message");
      return null;
    }
    String trimmed = value.replaceAll("^[\\s\\p{Z}\\uFEFF]+|[\\s\\p{Z}\\uFEFF]+$", "");
    if (trimmed.isEmpty()) throw new IllegalArgumentException("Empty message");
    return trimmed;
  }

  /**
   * Validates HTTPS asset syntax without fetching it; the operator owns nonpersonal public content.
   *
   * @param value optional public image URL, or null to remove media
   * @throws IllegalArgumentException for invalid syntax or embedded credentials
   */
  public static void image(String value) {
    if (value == null) return;
    https(value);
  }

  /**
   * Requires three canonical decimal components within JavaScript's exact integer range.
   *
   * @param value optional published minimum; null imposes no threshold
   * @throws IllegalArgumentException for malformed or unsafe components
   */
  public static void version(String value) {
    if (value == null) return;
    if (!VERSION.matcher(value).matches()) throw new IllegalArgumentException("Invalid version");
    for (String component : value.split("\\.")) {
      if (new BigInteger(component).compareTo(BigInteger.valueOf(MAX_REVISION)) > 0)
        throw new IllegalArgumentException("Unsafe version component");
    }
  }

  /**
   * Validates a supplied platform destination and the minimum/link dependency as one result.
   *
   * @param platform complete resulting minimum and store link
   * @param ios whether this is the Apple platform, otherwise Google Play
   * @throws IllegalArgumentException for a missing required link or invalid destination
   */
  public static void platform(ApplicationVersionSettings.Platform platform, boolean ios) {
    if (platform == null) throw new IllegalArgumentException("Missing platform");
    version(platform.minimumVersion());
    String url = platform.storeUrl();
    if (url == null) {
      if (platform.minimumVersion() != null) throw new IllegalArgumentException("Missing store");
      return;
    }
    URI uri = https(url);
    boolean valid =
        ios
            ? "apps.apple.com".equalsIgnoreCase(uri.getHost())
                && uri.getPath().matches("/(?:[a-zA-Z]{2}/)?app/(?:[^/]+/)?id[0-9]+")
            : "play.google.com".equalsIgnoreCase(uri.getHost())
                && "/store/apps/details".equals(uri.getPath())
                && intendedAndroidApplication(uri.getRawQuery());
    if (!valid) throw new IllegalArgumentException("Invalid store");
  }

  /**
   * Requires exactly one intended Android application ID while retaining ordinary store parameters.
   *
   * @param query raw optional store query
   * @return whether exactly one application ID identifies the selected Blockout listing
   */
  private static boolean intendedAndroidApplication(String query) {
    if (query == null) return false;
    int identifiers = 0;
    for (String pair : query.split("&")) {
      String[] parameter = pair.split("=", 2);
      if ("id".equals(URLDecoder.decode(parameter[0], StandardCharsets.UTF_8))) {
        if (parameter.length != 2
            || !"com.blockoutproject.blockout"
                .equals(URLDecoder.decode(parameter[1], StandardCharsets.UTF_8))) return false;
        identifiers++;
      }
    }
    return identifiers == 1;
  }

  /**
   * Parses an absolute HTTPS URL without embedded credentials or an invalid port.
   *
   * @param value supplied destination, with no normalization or remote fetch
   * @return the parsed absolute URL
   * @throws IllegalArgumentException for unsupported or malformed input
   */
  private static URI https(String value) {
    URI uri = URI.create(value);
    if (!"https".equalsIgnoreCase(uri.getScheme())
        || uri.getHost() == null
        || uri.getRawUserInfo() != null
        || uri.getPort() > 65535) throw new IllegalArgumentException("Invalid HTTPS URL");
    return uri;
  }
}
