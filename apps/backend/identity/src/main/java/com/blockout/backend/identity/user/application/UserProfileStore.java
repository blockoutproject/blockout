package com.blockout.backend.identity.user.application;

import com.blockout.backend.identity.user.domain.ExternalIdentity;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Persistence boundary; the application owns the short creation transaction. */
public interface UserProfileStore {
  /**
   * Reads a local profile by exact external identity without creating or synchronizing data.
   *
   * @param identity exact issuer/subject lookup key
   * @return the persisted profile, or empty when no binding exists
   */
  Optional<UserProfile> find(ExternalIdentity identity);

  /**
   * Serializes competing creates until the caller transaction ends.
   *
   * @param identity exact identity whose creation is serialized
   * @throws IllegalStateException if no owner transaction exists on this datasource
   */
  void lockCreation(ExternalIdentity identity);

  /**
   * Requires the creation lock and transaction. Empty means only a pseudonym collision; other
   * persistence failures must roll back profile, external identity and billing binding together.
   *
   * @param identity canonical identity; its subject is retained as the billing customer ID
   * @param id new business profile identifier
   * @param pseudo normalized candidate whose key must be unique
   * @param attributes validated nullable provider attributes
   * @param now creation instant shared by the new records
   * @param project retained billing project
   * @param environment production or sandbox billing namespace
   * @return the persisted profile, or empty for a pseudonym collision
   * @throws IllegalStateException no owner transaction exists on this datasource
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
