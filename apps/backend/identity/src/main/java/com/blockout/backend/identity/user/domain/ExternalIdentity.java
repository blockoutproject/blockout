package com.blockout.backend.identity.user.domain;

/**
 * Exact provider identity. Email, local UUID and connection labels never substitute for this key.
 *
 * @param issuer canonical trusted issuer string, compared exactly
 * @param subject canonical provider subject retained as the billing customer identity
 */
public record ExternalIdentity(String issuer, String subject) {
  /**
   * Checks local storage/path compatibility and rejects known anonymous subject placeholders. This
   * does not authenticate a token or prove that an account exists at the provider.
   *
   * @return whether this pair can be handled by the profile owner
   */
  public boolean supported() {
    return issuer != null
        && !issuer.isBlank()
        && issuer.length() <= 512
        && subject != null
        && !subject.isBlank()
        && subject.length() <= 100
        && !subject.contains("/")
        && !subject.chars().anyMatch(Character::isISOControl)
        && !java.util.Set.of(
                "null", "undefined", "anonymous", "unknown", "guest", "none", "0", "-1")
            .contains(subject);
  }
}
