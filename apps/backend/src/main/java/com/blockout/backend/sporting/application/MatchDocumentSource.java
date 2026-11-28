package com.blockout.backend.sporting.application;

import com.blockout.backend.sporting.application.model.MatchObservation.InformationSheet;
import java.net.URI;

/**
 * On-demand PDF relay; implementations retain neither bytes nor provider references after reading.
 */
public interface MatchDocumentSource {
  /**
   * Fetches one already eligible accepted reference with bounded transport and PDF validation.
   *
   * @param reference detached F02 locator, never supplied by the mobile caller
   * @return validated PDF bytes
   * @throws com.blockout.backend.sporting.application.exception.MatchDocumentUnavailableException
   *     when delivery fails
   */
  byte[] fetch(Reference reference);

  /**
   * A published URL or official information-form context; exactly one locator is present.
   *
   * @param url accepted published PDF URL, or null for information
   * @param informationSheet accepted form context, or null for a published PDF
   */
  record Reference(URI url, InformationSheet informationSheet) {}
}
