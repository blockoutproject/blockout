package com.blockout.backend.identity.user.application;

/** Expected profile outcomes; provider details never cross the application boundary. */
public sealed interface ProfileResult {
  record Available(UserProfile profile, boolean created) implements ProfileResult {}

  record Missing() implements ProfileResult {}

  record Inactive() implements ProfileResult {}

  record Unsupported() implements ProfileResult {}

  record Mismatch() implements ProfileResult {}

  record Unavailable(IdentityFailureReason reason) implements ProfileResult {}
}
