package com.blockout.backend.support.application;

import java.nio.file.Path;
import java.util.List;

/** Native attachment boundary; a failed invocation may already have attached some originals. */
public interface SupportAttachments {
  /**
   * Attaches every validated original to the current case, without replay or rollback.
   *
   * @param issueNumber current known private case
   * @param images all private originals, owned by the submission until the child stops
   * @throws SupportUnavailableException for nonzero, timeout or unconfirmed process completion
   */
  void attach(long issueNumber, List<Path> images);
}
