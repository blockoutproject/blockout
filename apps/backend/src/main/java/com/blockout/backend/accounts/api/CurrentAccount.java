package com.blockout.backend.accounts.api;

import com.blockout.backend.accounts.application.AccountAccess;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/** Resolves the exact validated mobile principal for generated administrative interfaces. */
@Component
@RequiredArgsConstructor
public class CurrentAccount {
  private final AccountAccess accounts;

  /**
   * Returns the current local account; possession of a bearer alone creates no business account.
   *
   * @return original established business identity
   * @throws AccessDeniedException if no validated mobile principal or local account exists
   */
  public UUID id() {
    if (!(SecurityContextHolder.getContext().getAuthentication()
        instanceof JwtAuthenticationToken authentication))
      throw new AccessDeniedException("A mobile account is required");
    return accounts
        .currentId(
            authentication.getToken().getIssuer().toString(),
            authentication.getToken().getSubject())
        .orElseThrow(() -> new AccessDeniedException("A mobile account is required"));
  }
}
