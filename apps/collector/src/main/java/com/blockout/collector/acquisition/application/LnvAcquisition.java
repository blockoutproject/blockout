package com.blockout.collector.acquisition.application;

import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import java.net.URI;
import java.time.Instant;
import java.util.Map;

/** Explicit professional-page boundary, with independent sporting and media observations. */
public interface LnvAcquisition {
  /** One bounded shared page, discarded after its selected contextual groups. */
  interface Resource {
    /**
     * @param target admitted group
     * @return independently interpreted calendar
     */
    Calendar calendar(CollectionBackend.Target target);

    /**
     * @param target admitted group
     * @return independently interpreted standings
     */
    Read<SportingObservation.Standings> standings(CollectionBackend.Target target);

    /**
     * @param target admitted match
     * @return independently interpreted sporting detail
     */
    Read<SportingObservation.Facts> detail(CollectionBackend.Target target);

    /**
     * @param label published Scoresheet or DataVolley tab
     * @return document-only facts, or null when unpublished
     */
    Read<SportingObservation.Facts> document(String label);
  }

  /**
   * @param uri admitted page
   * @return one shared source read, without a durable page cache
   */
  Resource read(URI uri);

  /**
   * Reuses a discovery response only while its already admitted scopes are consumed.
   *
   * @param page complete bounded native response
   * @param observedAt actual response completion time
   * @return transient resource without another page request
   */
  Resource fromPage(ProviderHttpClient.Response page, Instant observedAt);

  /** Calendar plus qualified native-team media references for the admitted passage only. */
  record Calendar(
      SportingObservation.Calendar observation,
      Map<String, URI> logos,
      Instant observedAt,
      String documentCompetition) {}

  /** Passage-local auxiliary index access; no durable cache or separate schedule. */
  interface DocumentIndexes {
    /**
     * @param target admitted pool
     * @param calendar actual sporting evidence
     * @return qualified codes with the original index read time, or null without configured
     *     associations
     */
    Read<Map<String, SportingObservation.InformationSheet>> informationSheets(
        CollectionBackend.Target target, Calendar calendar);
  }

  /**
   * @return empty passage-local index state, discarded when the admitted passage ends
   */
  DocumentIndexes documentIndexes();

  /** One actual independently timestamped source read. */
  record Read<T>(T observation, Instant observedAt) {}

  /**
   * Reads one published logo through native caching.
   *
   * @param uri published URL
   * @return new source bytes or null for cache reuse
   */
  Read<byte[]> image(URI uri);
}
