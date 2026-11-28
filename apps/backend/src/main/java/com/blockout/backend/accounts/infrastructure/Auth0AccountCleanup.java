package com.blockout.backend.accounts.infrastructure;

import com.auth0.client.mgmt.ManagementApi;
import com.auth0.client.mgmt.core.ManagementApiException;
import com.blockout.backend.accounts.application.AccountCleanup;
import com.blockout.backend.accounts.application.AccountCleanup.Outcome;
import java.util.Optional;
import lombok.RequiredArgsConstructor;

/** Uses the installed official SDK; successful deletion includes Auth0-managed Apple revocation. */
@RequiredArgsConstructor
public class Auth0AccountCleanup implements AccountCleanup.Auth0 {
  private final Optional<ManagementApi> management;
  private final String expectedIssuer;

  /** {@inheritDoc} */
  @Override
  public Outcome remove(String issuer, String subject) {
    if (management.isEmpty()) {
      return Outcome.MISSING_CONFIGURATION;
    }
    if (!expectedIssuer.equals(issuer)) {
      return Outcome.UNSAFE_SCOPE;
    }
    ManagementApi client = management.orElseThrow();
    try {
      client.users().delete(subject);
      return Outcome.REMOVED;
    } catch (ManagementApiException failure) {
      if (failure.statusCode() == 404) {
        return Outcome.ABSENT;
      }
      throw failure;
    }
  }
}
