package com.blockout.backend.identity.user.application;

import com.blockout.backend.identity.user.domain.ExternalIdentity;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Persistence boundary; the application owns the short creation transaction. */
public interface UserProfileStore {
  Optional<UserProfile> find(ExternalIdentity identity);

  /** Serialize competing creates for this exact identity in the caller's transaction. */
  void lockCreation(ExternalIdentity identity);

  /**
   * Requires the creation lock and transaction. Empty means only a pseudonym collision; other
   * persistence failures must roll back profile, external identity and billing binding together.
   */
  Optional<UserProfile> create(
      ExternalIdentity identity,
      UUID id,
      String pseudo,
      ExternalProfile attributes,
      Instant now,
      String project,
      String environment);
}
