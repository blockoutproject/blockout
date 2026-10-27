package com.blockout.collector.acquisition.application;

import java.net.URI;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.CompletionException;
import java.util.function.LongSupplier;
import org.springframework.core.task.TaskRejectedException;

/** Explicit professional-page boundary, with independent sporting and media observations. */
public interface LnvAcquisition {
  /** One bounded shared page, discarded after its selected contextual groups. */
  interface Resource {
    /**
     * Interprets one already admitted calendar group from the shared page.
     *
     * @param target admitted group
     * @return independently interpreted calendar
     * @throws RuntimeException when source context is contradictory or cannot be interpreted
     */
    Calendar calendar(CollectionBackend.Target target);

    /**
     * Interprets one independently published official standings group.
     *
     * @param target admitted group
     * @return independently interpreted standings
     * @throws RuntimeException when source context or the official table cannot be interpreted
     */
    Read<SportingObservation.Standings> standings(CollectionBackend.Target target);

    /**
     * Interprets usable sporting details and retains partial-field evidence.
     *
     * @param target admitted match
     * @return independently interpreted sporting detail
     * @throws RuntimeException when the source contradicts the admitted match or is uninterpretable
     */
    Read<SportingObservation.Facts> detail(CollectionBackend.Target target);

    /**
     * Resolves a published document tab only within the admitted match context.
     *
     * @param target admitted match and championship context
     * @param label published Scoresheet or DataVolley tab
     * @return document-only facts, or null when unpublished
     * @throws RuntimeException when the source contradicts the admitted context or cannot be read
     */
    Read<SportingObservation.Facts> document(CollectionBackend.Target target, String label);
  }

  /**
   * Acquires one bounded professional page without durable caching.
   *
   * @param uri admitted page
   * @return one shared source read, without a durable page cache
   * @throws IllegalArgumentException when the source URL is outside the configured origins
   * @throws TaskRejectedException when the shared provider capacity is full
   * @throws CompletionException when the asynchronous page acquisition fails
   */
  Resource read(URI uri);

  /**
   * Reuses a discovery response only while its already admitted scopes are consumed.
   *
   * @param page complete bounded native response
   * @param observedAt actual response completion time
   * @return transient resource without another page request
   */
  Resource fromPage(ProviderResponse page, Instant observedAt);

  /** Calendar plus qualified native-team media references for the admitted passage only. */
  record Calendar(
      SportingObservation.Calendar observation,
      Map<String, URI> logos,
      Instant observedAt,
      String documentCompetition) {}

  /** Passage-local auxiliary index access; no durable cache or separate schedule. */
  interface DocumentIndexes {
    /**
     * Associates auxiliary codes using only verified identities and actual index evidence.
     *
     * @param target admitted pool
     * @param calendar actual sporting evidence
     * @return qualified codes with the original index read time, or null without configured
     *     associations
     * @throws RuntimeException when the index cannot be read or interpreted; a failed read is not
     *     retried by another scope of this passage
     */
    DocumentRead informationSheets(CollectionBackend.Target target, Calendar calendar);
  }

  /**
   * Creates passage-local index reuse with the original observation tokens.
   *
   * @param nextOrdinal allocates order immediately before each actual XML source read
   * @return empty passage-local index state, discarded when the admitted passage ends
   */
  DocumentIndexes documentIndexes(LongSupplier nextOrdinal);

  /** One actual independently timestamped source read. */
  record Read<T>(T observation, Instant observedAt, boolean complete) {
    /**
     * Creates a fully usable independently interpreted observation.
     *
     * @param observation acquired facts
     * @param observedAt actual source completion time
     */
    public Read(T observation, Instant observedAt) {
      this(observation, observedAt, true);
    }
  }

  /** Auxiliary references retain both the timestamp and logical order of the original XML read. */
  record DocumentRead(
      Map<String, SportingObservation.InformationSheet> observation,
      Instant observedAt,
      long readOrdinal) {}

  /**
   * Reads one published logo through native caching.
   *
   * @param uri published URL
   * @return new source bytes or null for cache reuse
   * @throws IllegalArgumentException when the source URL is outside the configured origins
   * @throws TaskRejectedException when the shared provider capacity is full
   * @throws CompletionException when the asynchronous image acquisition fails
   */
  Read<byte[]> image(URI uri);
}
