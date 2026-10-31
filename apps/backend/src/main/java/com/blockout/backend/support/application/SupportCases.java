package com.blockout.backend.support.application;

/** Private case operations for the current send only, without search, replay or mobile receipt. */
public interface SupportCases {
  /**
   * Creates a new case with the requested intake state; a lost response may leave private effects.
   *
   * @param draft complete submitted content and initial intake state
   * @return the known issue number, used only during this request
   * @throws SupportUnavailableException when creation cannot be confirmed
   */
  long create(SupportCaseDraft draft);

  /**
   * Changes only intake labels after all attachments succeed. One bounded read of this known case
   * may establish an ambiguous final marking; no uploads or writes are replayed.
   *
   * @param issueNumber case created during this request
   * @throws SupportUnavailableException when complete marking cannot be established
   */
  void complete(long issueNumber);
}
