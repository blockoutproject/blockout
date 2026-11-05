package com.blockout.collector.acquisition.application;

/** Club provider boundary; technical failures never become an ordinary unresolved result. */
public interface ClubGeocoder {
  /**
   * Resolves the currently permitted address, falling back to the municipality for normal no-result
   * or ambiguous address responses. Technical failures throw without a fallback or source
   * withdrawal.
   *
   * @param address optional permitted street address
   * @param municipality non-null permitted municipality
   * @param postalCode optional current permitted postal filter
   * @param revision original F02 address/municipal/postal revision, returned unchanged
   * @return unique club point, qualified empty or ambiguity after the allowed resolution
   */
  SportingObservation.Locality read(
      String address, String municipality, String postalCode, String revision);
}
