package com.blockout.backend.sporting.application.model;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/** One atomic source-season discovery, independent from sporting classification. */
public record CatalogObservation(
    MatchObservation.Context context,
    boolean complete,
    List<Pool> pools,
    Map<String, String> phaseLabels) {
  /** Detaches the submitted positional sequence, including duplicate identities. */
  public CatalogObservation {
    pools = List.copyOf(pools);
    phaseLabels = phaseLabels == null ? null : Map.copyOf(phaseLabels);
  }

  /** Discovery without submitted phase names preserves any previously established names. */
  public CatalogObservation(MatchObservation.Context context, boolean complete, List<Pool> pools) {
    this(context, complete, pools, null);
  }

  /** Accepted source-scoped read and last independently established complete catalogue. */
  public record Evidence(
      ObservationOrder order, Instant observedAt, Boolean complete, Instant lastCompleteReadAt) {}

  /** Qualified native pool references; missing URLs preserve previously qualified values. */
  public record Pool(
      String packReference,
      String competitionReference,
      String poolReference,
      String tourReference,
      String groupReference,
      URI calendarUrl,
      URI standingsUrl,
      String sourceName) {}
}
