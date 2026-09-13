package com.blockout.backend.identity.user.application;

/** Expected profile outcomes; provider details never cross the application boundary. */
public sealed interface ProfileResult {
  /** Persisted active profile; created distinguishes initial provisioning from reuse. */
  record Available(UserProfile profile, boolean created) implements ProfileResult {}

  /** No local binding exists; a read alone does not provision it. */
  record Missing() implements ProfileResult {}

  /** A local profile exists but is not available for use. */
  record Inactive() implements ProfileResult {}

  /** The identity cannot be represented by the supported owner contract. */
  record Unsupported() implements ProfileResult {}

  /** External verification did not confirm the requested identity. */
  record Mismatch() implements ProfileResult {}

  /** External verification is temporarily unavailable or misconfigured. */
  record Unavailable(IdentityFailureReason reason) implements ProfileResult {}
}
