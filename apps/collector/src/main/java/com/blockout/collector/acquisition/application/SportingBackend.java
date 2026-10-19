package com.blockout.collector.acquisition.application;

import java.nio.file.Path;
import java.util.UUID;

/** Explicit F02 observation boundary; every mutation is attempted once, never replayed. */
public interface SportingBackend {
  /**
   * Submits qualified catalog evidence to the sporting owner.
   *
   * @param id admitted source binding
   * @param context read evidence
   * @param observation catalog presence
   * @return independent F02 outcomes
   */
  SportingObservation.CatalogOutcome catalog(
      UUID id, SportingObservation.Context context, SportingObservation.Catalog observation);

  /**
   * Submits one bounded calendar for independent match acceptance.
   *
   * @param id admitted pool
   * @param context read evidence
   * @param observation calendar facts
   * @return bounded independent match outcomes
   */
  SportingObservation.CalendarOutcome calendar(
      UUID id, SportingObservation.Context context, SportingObservation.Calendar observation);

  /**
   * Submits detail proposals without duplicating sporting precedence rules.
   *
   * @param id known authorized match
   * @param context read evidence
   * @param observation detail facts
   * @return F02 acceptance
   */
  SportingObservation.Outcome detail(
      UUID id, SportingObservation.Context context, SportingObservation.Facts observation);

  /**
   * Submits explicit publication evidence for whole-table acceptance.
   *
   * @param id admitted pool
   * @param context read evidence
   * @param observation qualified publication
   * @return F02 acceptance
   */
  SportingObservation.Outcome standings(
      UUID id, SportingObservation.Context context, SportingObservation.Standings observation);

  /**
   * Submits permitted club-source proposals with their original presence.
   *
   * @param id admitted club
   * @param context read evidence
   * @param observation permitted source proposals
   * @return F02 acceptance
   */
  SportingObservation.Outcome club(
      UUID id, SportingObservation.Context context, SportingObservation.Club observation);

  /**
   * Submits geocoding evidence for the selected locality revision.
   *
   * @param id admitted club
   * @param context read evidence
   * @param observation current locality outcome
   * @return F02 acceptance
   */
  SportingObservation.Outcome locality(
      UUID id, SportingObservation.Context context, SportingObservation.Locality observation);

  /**
   * Uploads original image bytes without retaining a collector-side archive.
   *
   * @param id authorized professional team
   * @param context actual image-read evidence
   * @param image transient image owned by the caller
   * @return F02 acceptance
   */
  SportingObservation.Outcome logo(UUID id, SportingObservation.Context context, Path image);
}
