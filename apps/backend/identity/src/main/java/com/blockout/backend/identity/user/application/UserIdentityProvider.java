package com.blockout.backend.identity.user.application;

import com.blockout.backend.identity.user.domain.ExternalIdentity;

/**
 * Reads the exact authenticated identity. Implementations must never link, delete or assign roles.
 */
@FunctionalInterface
public interface UserIdentityProvider {
  /**
   * Reads attributes for the exact authenticated subject without changing any external account.
   *
   * @param identity supported canonical issuer/subject pair
   * @return verified attributes, an identity mismatch, or safe provider unavailability
   */
  IdentityLookup find(ExternalIdentity identity);
}
