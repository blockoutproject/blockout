package com.blockout.backend.accounts.application;

/**
 * F12-owned ordinary admission seam; current-account identification deliberately does not call it.
 */
public interface AccountAdmission {
  /**
   * Requires ordinary admission before establishment or original-account navigation.
   *
   * @param bypass explicit temporary intent, never a grant in itself
   * @throws AccountUnavailableException if admission is unavailable
   */
  void requireOrdinaryAccess(boolean bypass);
}
