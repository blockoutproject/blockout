package com.blockout.backend.api.sports.api;

import com.blockout.backend.api.security.api.ApiRoutePolicy;
import com.blockout.backend.identity.config.IdentityAdministrationConfiguration;
import com.blockout.backend.sports.config.SportsConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

/** Uses native resource-server JWT validation before local admin or dedicated M2M authorization. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(FfvbScraperProperties.class)
@Import({SportsConfiguration.class, IdentityAdministrationConfiguration.class})
public class FfvbRouteConfiguration {
  /**
   * Registers only delivered reference endpoints; ordinary users cannot impersonate the scraper.
   *
   * @param properties allowed scraper machine clients
   * @return native Spring request authorization policy
   */
  @Bean
  ApiRoutePolicy ffvbRoutePolicy(FfvbScraperProperties properties) {
    return requests -> {
      requests
          .requestMatchers(
              "/api/v2/admin/ffvb/configuration",
              "/api/v2/admin/ffvb/mappings",
              "/api/v2/admin/ffvb/mappings/*",
              "/api/v2/admin/divisions",
              "/api/v2/admin/divisions/*")
          .authenticated();
      requests
          .requestMatchers("/api/v2/imports/ffvb/configuration", "/api/v2/imports/ffvb/mappings")
          .access(
              (authentication, _) ->
                  new AuthorizationDecision(scraper(authentication.get(), properties)));
    };
  }

  /**
   * Checks the native validated token's dedicated client, machine subject, grant and scope.
   *
   * @param authentication current Spring authentication
   * @param properties configured machine allowlist
   * @return true only for the expected machine boundary
   */
  private static boolean scraper(Authentication authentication, FfvbScraperProperties properties) {
    if (!(authentication.getPrincipal() instanceof Jwt jwt)) return false;
    String client = jwt.getClaimAsString("azp");
    return client != null
        && properties.clientIds().contains(client)
        && (client + "@clients").equals(jwt.getSubject())
        && "client-credentials".equals(jwt.getClaimAsString("gty"))
        && authentication.getAuthorities().stream()
            .anyMatch(
                authority -> authority.getAuthority().equals("SCOPE_read:ffvb-configuration"));
  }
}
