package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.InvalidSourceException;
import java.net.URI;

/** Credential-free HTTP references; only qualified collector provenance forbids fragments. */
@lombok.NoArgsConstructor(access = lombok.AccessLevel.PRIVATE)
public class SourceReference {

  /**
   * Validates a credential-free HTTP candidate; qualification still belongs to the collector.
   *
   * @param uri submitted reference
   * @param qualified whether collector provenance additionally forbids a fragment
   */
  static void requireUrl(URI uri, boolean qualified) {
    if (uri == null
        || uri.getHost() == null
        || uri.getUserInfo() != null
        || (qualified && uri.getFragment() != null)
        || !("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme())))
      throw new InvalidSourceException();
  }
}
