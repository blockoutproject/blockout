package com.blockout.backend.identity.user.application;

import com.blockout.backend.identity.user.domain.*;
import java.time.Clock;
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
  private final String environment;

  public UserProfiles(
      UserProfileStore profiles,
      UserIdentityProvider provider,
      TransactionTemplate transactions,
      Clock clock,
      String project,
      String environment) {
    this.profiles = profiles;
    this.provider = provider;
    this.transactions = transactions;
    this.clock = clock;
    this.project = project;
    this.environment = environment;
  }

  /** Pure owner read; missing profiles are not provisioned here. */
  public ProfileResult find(ExternalIdentity identity) {
    if (!identity.supported()) return new ProfileResult.Unsupported();
    return profiles
        .find(identity)
        .map(x -> available(x, false))
        .orElseGet(ProfileResult.Missing::new);
  }

  /** Idempotent by exact external identity, including concurrent first requests. */
  public ProfileResult ensure(ExternalIdentity identity) {
    var existing = find(identity);
    if (!(existing instanceof ProfileResult.Missing)) return existing;
    var lookup = provider.find(identity);
    if (lookup instanceof IdentityLookup.Unavailable failure)
      return new ProfileResult.Unavailable(failure.code());
    if (lookup instanceof IdentityLookup.Mismatch) return new ProfileResult.Mismatch();
    var attributes = ((IdentityLookup.Found) lookup).profile();
    return transactions.execute(
        _ -> {
          profiles.lockCreation(identity);
          var winner = profiles.find(identity);
          if (winner.isPresent()) return available(winner.get(), false);
          var id = UUID.randomUUID();
          var now = clock.instant();
          for (int attempt = 0; attempt <= 200; attempt++) {
            var result =
                profiles.create(
                    identity,
                    id,
                    InitialPseudonym.candidate(attributes.email(), attempt, id),
                    attributes,
                    now,
                    project,
                    environment);
            if (result.isPresent()) return available(result.get(), true);
          }
          throw new IllegalStateException("Pseudonym allocation exhausted");
        });
  }

  private ProfileResult available(UserProfile profile, boolean created) {
    return profile.active()
        ? new ProfileResult.Available(profile, created)
        : new ProfileResult.Inactive();
  }
}
