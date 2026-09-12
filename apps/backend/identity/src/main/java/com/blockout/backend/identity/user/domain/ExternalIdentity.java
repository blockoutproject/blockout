package com.blockout.backend.identity.user.domain;

/**
 * Exact provider identity. Email, local UUID and connection labels never substitute for this key.
 */
public record ExternalIdentity(String issuer, String subject) {
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
