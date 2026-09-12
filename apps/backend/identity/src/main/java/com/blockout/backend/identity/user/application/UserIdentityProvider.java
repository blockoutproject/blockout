package com.blockout.backend.identity.user.application;

import com.blockout.backend.identity.user.domain.ExternalIdentity;

/**
 * Reads the exact authenticated identity. Implementations must never link, delete or assign roles.
 */
@FunctionalInterface
public interface UserIdentityProvider {
  IdentityLookup find(ExternalIdentity identity);
}
