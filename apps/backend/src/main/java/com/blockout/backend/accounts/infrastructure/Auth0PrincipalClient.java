package com.blockout.backend.accounts.infrastructure;

import com.auth0.client.mgmt.ManagementApi;
import com.auth0.client.mgmt.core.ManagementException;
import com.auth0.client.mgmt.types.GetUserRequestParameters;
import com.auth0.client.mgmt.types.GetUserResponseContent;
import com.blockout.backend.accounts.application.PrincipalReader;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import jakarta.validation.Validator;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.core.OAuth2AuthorizationException;

/** Official Management SDK adapter; requests only exact-principal evidence, never name or photo. */
@Slf4j
@RequiredArgsConstructor
public class Auth0PrincipalClient implements PrincipalReader {
  private final ManagementApi client;
  private final Validator validator;

  /** {@inheritDoc} */
  @Override
  public Evidence read(String issuer, String subject) {
    try {
      GetUserResponseContent principal =
          client
              .users()
              .get(
                  subject,
                  GetUserRequestParameters.builder()
                      .fields("user_id,email,created_at")
                      .includeFields(true)
                      .build());
      if (principal.getUserId().filter(subject::equals).isEmpty())
        throw new AccountUnavailableException();
      String candidate = principal.getEmail().orElse(null);
      String email = validator.validate(new ProviderEmail(candidate)).isEmpty() ? candidate : null;
      return new Evidence(
          email, principal.getCreatedAt().map(java.time.OffsetDateTime::toInstant).orElse(null));
    } catch (ManagementException
        | OAuth2AuthorizationException
        | AccountUnavailableException failure) {
      log.atWarn()
          .addKeyValue("operation", "account_principal_read")
          .addKeyValue("provider", "auth0")
          .addKeyValue("outcome", "unavailable")
          .log("Principal evidence unavailable");
      throw new AccountUnavailableException(failure);
    }
  }

  /** Native validation of a usable provider value; email never determines business identity. */
  private record ProviderEmail(@NotBlank @Email String email) {}
}
