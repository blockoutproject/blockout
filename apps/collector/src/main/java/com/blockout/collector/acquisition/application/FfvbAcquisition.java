package com.blockout.collector.acquisition.application;

/** Explicit FFVB acquisition boundary; the passage allocates order before each invocation. */
public interface FfvbAcquisition {
  /**
   * Interprets the selected calendar and isolates attributable row failures.
   *
   * @param target admitted pool and source context
   * @return interpreted complete or partial calendar
   */
  SportingObservation.Calendar calendar(CollectionBackend.Target target);

  /**
   * Reads the selected official table without deriving replacement standings.
   *
   * @param target admitted pool and source context
   * @return qualified official publication state
   */
  SportingObservation.Standings standings(CollectionBackend.Target target);
}
