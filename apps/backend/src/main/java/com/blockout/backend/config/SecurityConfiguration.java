package com.blockout.backend.config;

import com.blockout.backend.shared.http.SecurityProblemHandler;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authorization.AuthenticatedAuthorizationManager;
import org.springframework.security.authorization.AuthorityAuthorizationManager;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.authorization.AuthorizationManagers;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.JwtAudienceValidator;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

/**
 * Separates operational, collector and mobile trust; domain owners retain current business checks.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(SecurityProperties.class)
@Import(SecurityProblemHandler.class)
public class SecurityConfiguration {
  /**
   * Allows only the aggregate GET probe and refuses other operational paths without a local login.
   *
   * @param http native security builder for the operational route boundary
   * @return chain scoped to the probe and Actuator paths, leaving business routes to their owners
   * @throws Exception if Spring cannot construct its security filters
   */
  @Bean
  @Order(0)
  SecurityFilterChain operationalSecurity(HttpSecurity http) throws Exception {
    return http.securityMatcher("/health/**", "/actuator/**")
        .authorizeHttpRequests(
            requests ->
                requests
                    .requestMatchers(HttpMethod.GET, "/health")
                    .permitAll()
                    .anyRequest()
                    .denyAll())
        .build();
  }

  /**
   * Requires the dedicated collector client, audience and ingestion scope, without an HTTP session.
   *
   * @param http native security builder
   * @param properties environment-specific public trust inputs
   * @param problems safe canonical refusals before MVC
   * @return collector-only filter chain
   * @throws Exception if Spring cannot build the filters
   */
  @Bean
  @Order(1)
  SecurityFilterChain ingestionSecurity(
      HttpSecurity http, SecurityProperties properties, SecurityProblemHandler problems)
      throws Exception {
    return http.securityMatcher("/ingestion/**")
        .csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            requests ->
                requests
                    .anyRequest()
                    .access(
                        AuthorizationManagers.allOf(
                            client(properties.ingestionClientId()),
                            AuthorityAuthorizationManager.hasAuthority("SCOPE_sporting:ingest"))))
        .oauth2ResourceServer(
            oauth ->
                oauth
                    .jwt(jwt -> jwt.decoder(decoder(properties, properties.ingestionAudience())))
                    .authenticationEntryPoint(problems)
                    .accessDeniedHandler(problems))
        .build();
  }

  /**
   * Authenticates private mobile routes and preserves the exact public contract methods/resources.
   *
   * @param http native security builder
   * @param properties public mobile issuer, audience and client identity
   * @param problems safe canonical refusals before MVC
   * @return stateless mobile boundary; no administrative permission is inferred from a JWT
   * @throws Exception if Spring cannot build the filters
   */
  @Bean
  @Order(2)
  SecurityFilterChain mobileSecurity(
      HttpSecurity http, SecurityProperties properties, SecurityProblemHandler problems)
      throws Exception {
    AuthorizationManager<RequestAuthorizationContext> mobileClient =
        client(properties.mobileClientId());
    AuthorizationManager<RequestAuthorizationContext> publicRead =
        AuthorizationManagers.anyOf(AuthenticatedAuthorizationManager.anonymous(), mobileClient);
    return http.csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            requests ->
                requests
                    .requestMatchers(
                        HttpMethod.GET,
                        "/application-access",
                        "/api/v1/mobile/public/config/app-status",
                        "/legals/imprint",
                        "/legals/privacy",
                        "/legals/terms",
                        "/clubs",
                        "/teams",
                        "/pools",
                        "/sporting-search-options",
                        "/clubs/{clubId}",
                        "/clubs/{clubId}/teams",
                        "/clubs/{clubId}/logo",
                        "/teams/{teamId}",
                        "/teams/{teamId}/logo",
                        "/teams/{teamId}/follower-count",
                        "/divisions/{divisionId}/logo",
                        "/pools/{poolId}",
                        "/pools/{poolId}/standings",
                        "/pools/{poolId}/participants",
                        "/pools/{poolId}/follower-count",
                        "/matches",
                        "/matches/{matchId}",
                        "/matches/{matchId}/documents/{documentKind}")
                    .access(publicRead)
                    .requestMatchers(HttpMethod.POST, "/support-requests")
                    .access(publicRead)
                    .anyRequest()
                    .access(mobileClient))
        .oauth2ResourceServer(
            oauth ->
                oauth
                    .jwt(jwt -> jwt.decoder(decoder(properties, properties.mobileAudience())))
                    .authenticationEntryPoint(problems)
                    .accessDeniedHandler(problems))
        .build();
  }

  /**
   * Uses native signature/key caching and standard validators; a bearer requires an expiry.
   *
   * @param properties selected Auth0 issuer
   * @param audience the recipient for this HTTP boundary
   * @return decoder that loads public keys only when a bearer is presented
   */
  private NimbusJwtDecoder decoder(SecurityProperties properties, String audience) {
    NimbusJwtDecoder decoder =
        NimbusJwtDecoder.withJwkSetUri(
                properties.issuer().resolve(".well-known/jwks.json").toString())
            .build();
    JwtTimestampValidator timestamps = new JwtTimestampValidator();
    timestamps.setAllowEmptyExpiryClaim(false);
    decoder.setJwtValidator(
        JwtValidators.createDefaultWithValidators(
            timestamps,
            new JwtIssuerValidator(properties.issuer().toString()),
            new JwtAudienceValidator(audience)));
    return decoder;
  }

  /**
   * Authorizes the validated Auth0 default-profile client without treating it as a business grant.
   *
   * @param clientId exact client permitted for this boundary
   * @return ordinary authorization manager; an authenticated wrong client receives 403
   */
  private AuthorizationManager<RequestAuthorizationContext> client(String clientId) {
    return (authentication, context) -> {
      Authentication principal = authentication.get();
      return new AuthorizationDecision(
          principal instanceof JwtAuthenticationToken jwt
              && clientId.equals(jwt.getToken().getClaimAsString("azp")));
    };
  }
}
