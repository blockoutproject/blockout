package com.blockout.backend.api.user.api;

import com.blockout.backend.identity.user.domain.ExternalIdentity;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/** Extracts a validated native-user identity; token claims never grant business permissions. */
@Component
public final class CurrentUserActor {
  private final NativeUserProperties properties;

  /**
   * Binds native-user extraction to the configured public client allowlist.
   *
   * @param properties validated native client identifiers
   */
  public CurrentUserActor(NativeUserProperties properties) {
    this.properties = properties;
  }

  /**
   * Reads the verified JWT from the current security context without contacting a provider. Machine
   * grants, client subjects and unapproved native clients cannot become business actors.
   *
   * @return the exact issuer/subject pair, or empty when no supported native actor is present
   */
  public Optional<ExternalIdentity> current() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt))
      return Optional.empty();
    Object subjectClaim = jwt.getClaims().get("sub");
    Object client = jwt.getClaims().get("azp");
    Object grant = jwt.getClaims().get("gty");
    if (!(subjectClaim instanceof String subject)
        || subject.isBlank()
        || subject.endsWith("@clients")
        || !(client instanceof String clientId)
        || !properties.nativeClientIds().contains(clientId)
        || "client-credentials".equals(grant)
        || "client_credentials".equals(grant)) return Optional.empty();
    return Optional.of(new ExternalIdentity(jwt.getIssuer().toString(), subject));
  }
}
