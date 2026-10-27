package com.blockout.collector.acquisition.application;

import java.net.URI;
import java.time.Instant;

/**
 * Explicit FFVB boundary; a passage reads each shared resource once before interpreting its scopes.
 */
public interface FfvbAcquisition {
  /**
   * Identifies the full resource shared by admitted calendar and standings targets.
   *
   * @param target admitted source context
   * @return full-calendar URL, without changing its native scope parameters
   */
  URI resourceUrl(CollectionBackend.Target target);

  /**
   * Reads one resource after the passage has allocated its logical order.
   *
   * @param url full resource URL
   * @return resource retained only while its selected targets are processed
   */
  Resource read(URI url);

  /**
   * Reuses a discovery response only while its already admitted scopes are consumed.
   *
   * @param page complete bounded native response
   * @param observedAt actual response completion time
   * @return transient resource without another page request
   */
  Resource fromPage(ProviderResponse page, Instant observedAt);

  /** One sequentially consumed HTML resource and optional export, discarded after its scopes. */
  interface Resource {
    /**
     * Interprets a selected calendar, sharing the export with other scopes of this resource.
     *
     * @param target admitted pool context
     * @return interpreted calendar with the actual export completion time
     */
    Read<SportingObservation.Calendar> calendar(CollectionBackend.Target target);

    /**
     * Interprets an independent official table from the already-read HTML.
     *
     * @param target admitted pool context
     * @return official publication with the original HTML completion time
     */
    Read<SportingObservation.Standings> standings(CollectionBackend.Target target);
  }

  /** Interpretation retains the original read time even when several targets share its bytes. */
  record Read<T>(T observation, Instant observedAt) {}
}
