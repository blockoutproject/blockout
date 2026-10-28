package com.blockout.backend.accounts.api;

import com.blockout.backend.accounts.application.AccountAccess;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/** Resolves the exact validated mobile principal for generated personal and administrative APIs. */
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
    return findId().orElseThrow(() -> new AccessDeniedException("A mobile account is required"));
  }

  /**
   * Resolves an established account while leaving ordinary absence to the consuming HTTP policy.
   *
   * @return current business identity, or empty without a validated principal or local account;
   *     storage failures propagate rather than becoming absence
   */
  public Optional<UUID> findId() {
    if (!(SecurityContextHolder.getContext().getAuthentication()
        instanceof JwtAuthenticationToken authentication)) return Optional.empty();
    return accounts.currentId(
        authentication.getToken().getIssuer().toString(), authentication.getToken().getSubject());
  }
}
