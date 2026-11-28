package com.blockout.backend.accounts.infrastructure;

import com.auth0.client.mgmt.ManagementApi;
import com.auth0.client.mgmt.core.ManagementApiException;
import com.auth0.client.mgmt.types.GetUserRequestParameters;
import com.auth0.client.mgmt.types.GetUserResponseContent;
import com.auth0.client.mgmt.types.UserIdentitySchema;
import com.blockout.backend.accounts.application.AccountCleanup;
import com.blockout.backend.accounts.application.AccountCleanup.Outcome;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;

/** Uses the installed official SDK; successful deletion includes Auth0-managed Apple revocation. */
@RequiredArgsConstructor
public class Auth0AccountCleanup implements AccountCleanup.Auth0 {
  private final Optional<ManagementApi> management;
  private final AccountCleanupProperties properties;
  private final String expectedIssuer;

  /** {@inheritDoc} */
  @Override
  public Outcome remove(String issuer, String subject) {
    if (properties.auth0Connections().isEmpty()) {
      return Outcome.NOT_CONFIGURED;
    }
    if (management.isEmpty()) {
      return Outcome.MISSING_CONFIGURATION;
    }
    if (!expectedIssuer.equals(issuer)) {
      return Outcome.UNSAFE_SCOPE;
    }
    ManagementApi client = management.orElseThrow();
    try {
      GetUserResponseContent user =
          client
              .users()
              .get(
                  subject,
                  GetUserRequestParameters.builder()
                      .fields("user_id,identities")
                      .includeFields(true)
                      .build());
      if (user.getUserId().filter(subject::equals).isEmpty()
          || !safeIdentities(user.getIdentities().orElse(List.of()))) {
        return Outcome.UNSAFE_SCOPE;
      }
      client.users().delete(subject);
      return Outcome.REMOVED;
    } catch (ManagementApiException failure) {
      if (failure.statusCode() == 404) {
        return Outcome.ABSENT;
      }
      throw failure;
    }
  }

  /**
   * The Management API deletes the whole profile, so every linked identity must be in scope.
   *
   * @param identities exact original principal's live identity evidence, read only after commit
   * @return whether every identity belongs to a configured connection
   */
  private boolean safeIdentities(List<UserIdentitySchema> identities) {
    return !identities.isEmpty()
        && identities.stream()
            .allMatch(
                identity ->
                    identity.getProvider().isPresent()
                        && identity
                            .getConnection()
                            .filter(properties.auth0Connections()::contains)
                            .isPresent());
  }
}
