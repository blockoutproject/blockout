package com.blockout.backend.identity.administration.application;

import com.blockout.backend.identity.user.domain.ExternalIdentity;
import java.util.Optional;
import java.util.UUID;

/** Identity-owned local administrator eligibility; callers cannot supply a trusted user UUID. */
public interface AdministratorAccess {
  /**
   * Resolves a currently active administrator without provider access or permission caching.
   *
   * @param actor verified issuer/subject pair
   * @return the current local administrator ID, empty for missing, inactive or ordinary users
   */
  Optional<UUID> find(ExternalIdentity actor);
}
