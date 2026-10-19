package com.blockout.backend.legacy.infrastructure;

import jakarta.validation.constraints.Pattern;
import org.hibernate.validator.constraints.URL;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Read-only retirement inputs, independent of mutable V2 admission settings. Absent values leave
 * the legacy read unavailable; supplied values must be well formed. Release qualification verifies
 * that the versions exclude every supported V1 build and that the URLs identify the existing apps.
 *
 * @param minVersionIos qualified first V2 iOS release, or null before configuration
 * @param minVersionAndroid qualified first V2 Android release, or null before configuration
 * @param storeUrlIos existing HTTPS App Store listing, or null before configuration
 * @param storeUrlAndroid existing HTTPS Google Play listing, or null before configuration
 */
@Validated
@ConfigurationProperties("blockout.legacy")
public record LegacyRetirementProperties(
    @Pattern(regexp = RELEASE_VERSION) String minVersionIos,
    @Pattern(regexp = RELEASE_VERSION) String minVersionAndroid,
    @Pattern(regexp = "\\S+") @URL(protocol = "https", host = "apps.apple.com") String storeUrlIos,
    @Pattern(regexp = "\\S+") @URL(protocol = "https", host = "play.google.com")
        String storeUrlAndroid) {
  private static final String RELEASE_VERSION = "(?:0|[1-9][0-9]*)(?:\\.(?:0|[1-9][0-9]*)){2}";

  /**
   * Requires all retirement inputs before publishing any threshold; startup validates supplied
   * values.
   *
   * @return whether both platforms have an explicit version and store destination
   */
  public boolean isConfigured() {
    return minVersionIos != null
        && minVersionAndroid != null
        && storeUrlIos != null
        && storeUrlAndroid != null;
  }
}
