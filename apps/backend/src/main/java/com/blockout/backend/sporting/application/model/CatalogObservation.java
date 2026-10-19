package com.blockout.backend.sporting.application.model;

import java.net.URI;
import java.util.List;

/** One atomic source-season discovery, independent from sporting classification. */
public record CatalogObservation(
    MatchObservation.Context context, boolean complete, List<Pool> pools) {
  /** Detaches the submitted positional sequence, including duplicate identities. */
  public CatalogObservation {
    pools = List.copyOf(pools);
  }

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
