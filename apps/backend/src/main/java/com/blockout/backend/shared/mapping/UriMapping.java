package com.blockout.backend.shared.mapping;

import java.net.URI;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Converts URI representations without canonicalizing their owner-defined literal. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class UriMapping {
  /**
   * Parses a URI literal while retaining an absent value.
   *
   * @param source valid literal or null
   * @return parsed URI or null
   * @throws IllegalArgumentException when the literal is not a valid URI
   */
  public static URI toUri(String source) {
    return source == null ? null : URI.create(source);
  }

  /**
   * Returns the original URI representation without normalization.
   *
   * @param source URI or null
   * @return unchanged literal or null
   */
  public static String toText(URI source) {
    return source == null ? null : source.toString();
  }
}
