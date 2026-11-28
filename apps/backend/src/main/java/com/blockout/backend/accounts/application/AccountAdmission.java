package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import java.util.Optional;
import java.util.UUID;

/**
 * F12-owned ordinary admission seam; current-account identification deliberately does not call it.
 */
public interface AccountAdmission {
  /**
   * Requires ordinary admission before establishment or original-account navigation.
   *
   * @param issuer exact issuer from the validated mobile principal
   * @param subject exact subject from that principal; never resolved by email
   * @param bypass explicit temporary intent, never a grant in itself
   * @return the exact account admitted by active personal bypass, or empty for inactive
   *     maintenance; callers must retain this lifecycle rather than resolve a replacement after
   *     admission
   * @throws AccountUnavailableException if admission is unavailable
   */
  Optional<UUID> requireOrdinaryAccess(String issuer, String subject, boolean bypass);
}
