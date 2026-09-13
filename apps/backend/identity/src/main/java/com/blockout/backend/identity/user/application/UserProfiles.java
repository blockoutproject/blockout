package com.blockout.backend.identity.user.application;

import com.blockout.backend.identity.subscription.domain.BillingEnvironment;
import com.blockout.backend.identity.user.domain.*;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Owns atomic profile creation. External reads finish before any SQL transaction or lock begins.
 */
public final class UserProfiles {
  private final UserProfileStore profiles;
  private final UserIdentityProvider provider;
  private final TransactionTemplate transactions;
  private final Clock clock;
  private final String project;
  private final BillingEnvironment environment;
  private final java.util.function.Consumer<UUID> initializeSubscription;

  /**
   * Binds the profile owner to persistence, external verification and short SQL transactions.
   *
   * @param profiles store sharing the transaction datasource
   * @param provider read-only external identity verification
   * @param transactions creation transaction boundary
   * @param clock creation timestamp source
   * @param project retained RevenueCat project identifier
   * @param environment production or sandbox billing namespace
   * @param initializeSubscription initial verification publication in the profile transaction
   */
  public UserProfiles(
      UserProfileStore profiles,
      UserIdentityProvider provider,
      TransactionTemplate transactions,
      Clock clock,
      String project,
      BillingEnvironment environment,
      java.util.function.Consumer<UUID> initializeSubscription) {
    this.profiles = profiles;
    this.provider = provider;
    this.transactions = transactions;
    this.clock = clock;
    this.project = project;
    this.environment = environment;
    this.initializeSubscription = initializeSubscription;
  }

  /**
   * Reads locally without provider calls or writes, preserving inactive and unsupported outcomes.
   *
   * @param identity exact authenticated issuer/subject pair
   * @return the existing profile outcome or Missing; no provisioning is performed
   */
  public ProfileResult find(ExternalIdentity identity) {
    if (!identity.supported()) return new ProfileResult.Unsupported();
    return profiles
        .find(identity)
        .map(x -> available(x, false))
        .orElseGet(ProfileResult.Missing::new);
  }

  /**
   * Reuses an existing profile or creates its profile, external identity and billing binding
   * atomically. Provider verification precedes SQL. After locking, a concurrent winner is returned
   * unchanged. Provider failure or mismatch writes nothing; billing uses the unchanged canonical
   * subject.
   *
   * @param identity exact authenticated issuer/subject pair
   * @return the persisted profile and creation flag, or a safe rejection/unavailable outcome
   * @throws IllegalStateException if every bounded pseudonym candidate collides
   * @throws org.springframework.dao.DataAccessException if persistence fails; creation rolls back
   */
  public ProfileResult ensure(ExternalIdentity identity) {
    ProfileResult existing = find(identity);
    if (!(existing instanceof ProfileResult.Missing)) return existing;
    IdentityLookup lookup = provider.find(identity);
    if (lookup instanceof IdentityLookup.Unavailable failure)
      return new ProfileResult.Unavailable(failure.reason());
    if (lookup instanceof IdentityLookup.Mismatch) return new ProfileResult.Mismatch();
    ExternalProfile attributes = ((IdentityLookup.Found) lookup).profile();
    return transactions.execute(
        _ -> {
          profiles.lockCreation(identity);
          Optional<UserProfile> winner = profiles.find(identity);
          if (winner.isPresent()) return available(winner.get(), false);
          UUID id = UUID.randomUUID();
          Instant now = clock.instant();
          for (int attempt = 0; attempt <= 200; attempt++) {
            Optional<UserProfile> result =
                profiles.create(
                    identity,
                    id,
                    InitialPseudonym.candidate(attributes.email(), attempt, id),
                    attributes,
                    now,
                    project,
                    environment);
            if (result.isPresent()) {
              initializeSubscription.accept(id);
              return available(result.get(), true);
            }
          }
          throw new IllegalStateException("Pseudonym allocation exhausted");
        });
  }

  /**
   * Prevents inactive profiles from being returned as available resources.
   *
   * @param profile persisted owner view
   * @param created whether this request inserted the profile
   * @return an available profile with creation provenance, or an inactive outcome
   */
  private ProfileResult available(UserProfile profile, boolean created) {
    return profile.active()
        ? new ProfileResult.Available(profile, created)
        : new ProfileResult.Inactive();
  }
}
