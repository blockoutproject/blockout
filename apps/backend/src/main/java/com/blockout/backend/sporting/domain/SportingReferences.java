package com.blockout.backend.sporting.domain;

import java.net.URI;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Qualification shared by catalog, calendar and independent match reference proposals. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SportingReferences {
  /**
   * Accepts absence or an absolute HTTP(S) locator without embedded credentials. Retrieval
   * authorization and supported provider hosts remain with the fetching owner.
   *
   * @param value supplied locator, or null for absence
   * @return whether the locator has a usable transport shape
   */
  public static boolean qualified(URI value) {
    return value == null
        || (value.getHost() != null
            && value.getUserInfo() == null
            && ("https".equalsIgnoreCase(value.getScheme())
                || "http".equalsIgnoreCase(value.getScheme())));
  }
}
