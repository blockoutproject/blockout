package com.blockout.backend.contributions.domain;

import java.net.URI;
import java.util.Locale;

/** Literal submitted address; recognition certifies no content, availability or equivalence. */
public record StreamAddress(String value) {
  /**
   * Validates the submitted literal without trimming, normalizing or accessing the network.
   *
   * @param value absolute authorized HTTP(S) address
   * @throws IllegalArgumentException if syntax, scheme, credentials or host are not permitted
   */
  public StreamAddress {
    recognize(value);
  }

  /** Recognized providers, independent of transport and provider APIs. */
  public enum Platform {
    YOUTUBE,
    TWITCH,
    FACEBOOK
  }

  /**
   * Recognizes the local host without resolving or normalizing the submitted address.
   *
   * @return authorized platform
   */
  public Platform platform() {
    return recognize(value);
  }

  /**
   * Uses only URI's syntax components; short domains are exact, full domains allow subdomains.
   *
   * @param value original literal, possibly invalid
   * @return recognized platform
   * @throws IllegalArgumentException with a safe message excluding the supplied address
   */
  private static Platform recognize(String value) {
    if (value == null) throw new IllegalArgumentException("Stream address is not permitted");
    URI uri;
    try {
      uri = URI.create(value);
    } catch (IllegalArgumentException invalid) {
      throw new IllegalArgumentException("Stream address is not permitted");
    }
    if (!uri.isAbsolute()
        || !("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
        || uri.getHost() == null
        || uri.getHost().isEmpty()
        || uri.getRawUserInfo() != null)
      throw new IllegalArgumentException("Stream address is not permitted");
    String host = uri.getHost().toLowerCase(Locale.ROOT);
    if (host.equals("youtu.be") || domain(host, "youtube.com")) return Platform.YOUTUBE;
    if (domain(host, "twitch.tv")) return Platform.TWITCH;
    if (host.equals("fb.watch") || domain(host, "facebook.com")) return Platform.FACEBOOK;
    throw new IllegalArgumentException("Stream address is not permitted");
  }

  /**
   * Recognizes a complete host suffix separated by a DNS label boundary.
   *
   * @param host lower-case URI host
   * @param domain authorized full provider domain
   * @return whether host is the exact domain or a dot-delimited subdomain
   */
  private static boolean domain(String host, String domain) {
    return host.equals(domain) || host.endsWith("." + domain);
  }
}
