package com.blockout.backend.identity.user.application;

/** Provider outcome without provider DTOs, credentials, exception messages or partial profiles. */
public sealed interface IdentityLookup {
  record Found(ExternalProfile profile) implements IdentityLookup {}

  record Unavailable(IdentityFailureReason reason) implements IdentityLookup {}

  record Mismatch() implements IdentityLookup {}
}
