package com.blockout.collector.acquisition.application;

/** Municipal provider boundary; technical failures never become an ordinary unresolved result. */
public interface MunicipalGeocoder {
  /**
   * Resolves only the currently permitted municipal context supplied by F02.
   *
   * @param municipality non-null permitted municipality, never a street address
   * @param postalCode optional current permitted postal filter
   * @param revision original F02 locality revision, returned unchanged
   * @return unique point, qualified empty or ambiguity; technical failures throw
   */
  SportingObservation.Locality read(String municipality, String postalCode, String revision);
}
