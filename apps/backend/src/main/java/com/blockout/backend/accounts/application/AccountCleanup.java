package com.blockout.backend.accounts.application;

/** Provider-specific bounded original-target operations; every call runs outside SQL. */
public final class AccountCleanup {
  /** Prevents construction of this namespace of provider boundary contracts. */
  private AccountCleanup() {}

  /** Safe finite outcomes; only refusal, missing evidence and uncertainty require diagnostics. */
  public enum Outcome {
    REMOVED,
    QUEUED,
    ABSENT,
    MISSING_CONFIGURATION,
    MISSING_TARGET,
    UNSAFE_SCOPE,
    UNAVAILABLE_OR_UNCERTAIN;

    /**
     * @return whether this documented outcome needs private manual handling
     */
    public boolean needsAttention() {
      return this != REMOVED && this != QUEUED && this != ABSENT;
    }
  }

  /** Exact Auth0 original-principal cleanup, including provider-managed Apple revocation. */
  @FunctionalInterface
  public interface Auth0 {
    /**
     * Checks environment/identity scope and attempts one delete of the captured principal.
     *
     * @param issuer captured original issuer
     * @param subject captured original subject
     * @return documented acknowledgment or safe manual-handling category
     */
    Outcome remove(String issuer, String subject);
  }

  /** RevenueCat customer removal, independently of Apple/Google store billing. */
  @FunctionalInterface
  public interface RevenueCat {
    /**
     * Attempts one original customer deletion only with safe project/test scope.
     *
     * @param customerId known original reference, never the current account mapping
     * @return queued acknowledgment, absence or safe manual-handling category
     */
    Outcome remove(String customerId);
  }
}
