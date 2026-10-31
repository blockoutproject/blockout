package com.blockout.backend.accounts.infrastructure;

import com.auth0.client.mgmt.ManagementApi;
import com.auth0.client.mgmt.core.ManagementApiException;
import com.auth0.client.mgmt.types.GetUserRequestParameters;
import com.auth0.client.mgmt.types.GetUserResponseContent;
import com.auth0.client.mgmt.types.UserIdentitySchema;
import com.blockout.backend.accounts.application.AccountCleanup;
import com.blockout.backend.accounts.application.AccountCleanup.Outcome;
import com.blockout.backend.accounts.infrastructure.AccountCleanupProperties.Environment;
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
    if (properties.environment() == Environment.DISABLED || management.isEmpty())
      return Outcome.MISSING_CONFIGURATION;
    if (!expectedIssuer.equals(issuer)) return Outcome.UNSAFE_SCOPE;
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
          || !safeIdentities(user.getIdentities().orElse(List.of()))) return Outcome.UNSAFE_SCOPE;
      client.users().delete(subject);
      return Outcome.REMOVED;
    } catch (ManagementApiException failure) {
      if (failure.statusCode() == 404) return Outcome.ABSENT;
      throw failure;
    }
  }

  /**
   * Refuses incomplete/foreign linked identities, especially shared-tenant preproduction users.
   *
   * @param identities exact original principal's live identity evidence, read only after commit
   * @return whether every identity belongs to the explicitly activated environment
   */
  private boolean safeIdentities(List<UserIdentitySchema> identities) {
    if (identities.isEmpty()) return false;
    if (properties.environment() == Environment.PREPRODUCTION) {
      String connection = properties.preproductionConnection();
      return connection != null
          && !connection.isBlank()
          && identities.stream()
              .allMatch(
                  identity ->
                      identity
                              .getProvider()
                              .map(Object::toString)
                              .filter("auth0"::equals)
                              .isPresent()
                          && identity.getConnection().filter(connection::equals).isPresent());
    }
    return identities.stream()
        .allMatch(
            identity ->
                identity
                        .getProvider()
                        .map(Object::toString)
                        .filter(
                            provider ->
                                provider.equals("google-oauth2") || provider.equals("apple"))
                        .isPresent()
                    && identity
                        .getConnection()
                        .filter(
                            connection ->
                                connection.equals("google-oauth2") || connection.equals("apple"))
                        .isPresent());
  }
}
