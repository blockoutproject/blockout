package com.blockout.collector.acquisition.application;

/** Current club-source acquisition for identities already encountered by the sporting owner. */
public interface ClubSheets {
  /**
   * Reads one exact covered club without directory enumeration or inferred disappearance.
   *
   * @param reference exact textual provider reference, including leading zeros
   * @return qualified source proposals; unavailable/unrecognized content throws without a proposal
   */
  SportingObservation.Club read(String reference);
}
