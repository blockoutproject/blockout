package com.blockout.backend.identity.user.application;

/** Provider outcome without provider DTOs, credentials, exception messages or partial profiles. */
public sealed interface IdentityLookup {
  /** Verified attributes for the exact requested subject. */
  record Found(ExternalProfile profile) implements IdentityLookup {}

  /** Safe operational failure; no partially verified attributes are exposed. */
  record Unavailable(IdentityFailureReason reason) implements IdentityLookup {}

  /** The provider response identifies a different subject. */
  record Mismatch() implements IdentityLookup {}
}
