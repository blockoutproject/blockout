package com.blockout.backend.config;

import com.blockout.backend.access.api.MaintenanceAdmissionFilter;
import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.shared.http.SecurityProblemHandler;
import org.springframework.beans.factory.annotation.Qualifier;
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
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.servlet.HandlerExceptionResolver;

/** Separates operational, collector and mobile trust from the public legacy update read. */
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
   * Keeps the exact legacy update read public even when V1 sends obsolete bearer credentials.
   *
   * @param http native security builder without resource-server authentication on this read
   * @return stateless chain limited to the legacy status GET; other routes retain their own checks
   * @throws Exception if Spring cannot build the filters
   */
  @Bean
  @Order(2)
  SecurityFilterChain legacyStatusSecurity(HttpSecurity http) throws Exception {
    return http.securityMatcher(
            PathPatternRequestMatcher.withDefaults()
                .matcher(HttpMethod.GET, "/api/v1/mobile/public/config/app-status"))
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(requests -> requests.anyRequest().permitAll())
        .build();
  }

  /**
   * Authenticates private mobile routes and preserves the exact public contract methods/resources.
   *
   * @param http native security builder
   * @param properties public mobile issuer, audience and client identity
   * @param problems safe canonical refusals before MVC
   * @param maintenance current database-owned ordinary admission policy
   * @param resolver canonical MVC problem mapping for admission failures before dispatch
   * @return stateless mobile boundary; no administrative permission is inferred from a JWT
   * @throws Exception if Spring cannot build the filters
   */
  @Bean
  @Order(3)
  SecurityFilterChain mobileSecurity(
      HttpSecurity http,
      SecurityProperties properties,
      SecurityProblemHandler problems,
      MaintenanceAdmission maintenance,
      @Qualifier("handlerExceptionResolver") HandlerExceptionResolver resolver)
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
        .addFilterAfter(
            new MaintenanceAdmissionFilter(maintenance, independentlyAdmitted(), resolver),
            AuthorizationFilter.class)
        .oauth2ResourceServer(
            oauth ->
                oauth
                    .jwt(jwt -> jwt.decoder(decoder(properties, properties.mobileAudience())))
                    .authenticationEntryPoint(problems)
                    .accessDeniedHandler(problems))
        .build();
  }

  /**
   * Selects actual method/resource exceptions only. Operational handlers still check their current
   * domain grants. F08 moderation remains ordinary. F05's implemented account operations retain
   * their AccountAdmission binding, original-lifecycle checks and single admission boundary.
   *
   * @return exact independent admission matchers; unknown routes/methods remain ordinary
   */
  private RequestMatcher independentlyAdmitted() {
    return new OrRequestMatcher(
        methods(
            HttpMethod.GET,
            "/application-access",
            "/accounts/me",
            "/legals/imprint",
            "/legals/privacy",
            "/legals/terms",
            "/administration/maintenance",
            "/administration/application-versions",
            "/administration/collection-seasons",
            "/administration/collection-seasons/{seasonId}",
            "/administration/collection-seasons/{seasonId}/source-bindings",
            "/administration/source-bindings/{sourceBindingId}",
            "/administration/source-bindings/{sourceBindingId}/children",
            "/administration/collection-controls",
            "/administration/collection-controls/{controlId}",
            "/administration/collection-controls/{controlId}/results",
            "/administration/clubs/{clubId}/presentation",
            "/administration/clubs/{clubId}/contacts",
            "/administration/teams/{teamId}/presentation",
            "/administration/pools/{poolId}/presentation",
            "/administration/packs/{packId}/classification",
            "/administration/pools/{poolId}/classification",
            "/administration/divisions",
            "/administration/divisions/{divisionId}"),
        methods(
            HttpMethod.PATCH,
            "/administration/maintenance",
            "/administration/application-versions",
            "/administration/clubs/{clubId}/presentation",
            "/administration/clubs/{clubId}/contacts",
            "/administration/teams/{teamId}/presentation",
            "/administration/divisions/{divisionId}/presentation"),
        methods(
            HttpMethod.PUT,
            "/administration/maintenance/activation",
            "/administration/source-bindings/{sourceBindingId}/candidate",
            "/administration/source-bindings/{sourceBindingId}/season-confirmation",
            "/administration/collection-controls/{controlId}/activity",
            "/administration/pools/{poolId}/presentation",
            "/administration/packs/{packId}/classification",
            "/administration/pools/{poolId}/classification",
            "/administration/divisions/{divisionId}/activity"),
        methods(
            HttpMethod.POST,
            "/administration/collection-seasons/{seasonId}/closure",
            "/administration/collection-seasons/{seasonId}/source-launches",
            "/administration/collection-seasons/{seasonId}/source-bindings",
            "/administration/source-bindings/{sourceBindingId}/validations",
            "/administration/collection-controls/{controlId}/requests",
            "/administration/divisions"),
        methods(HttpMethod.POST, "/accounts"),
        methods(
            HttpMethod.GET,
            "/accounts/{accountId:[0-9a-fA-F-]{36}}",
            "/accounts/{accountId:[0-9a-fA-F-]{36}}/photo"),
        methods(HttpMethod.PATCH, "/accounts/{accountId:[0-9a-fA-F-]{36}}"),
        methods(HttpMethod.DELETE, "/accounts/{accountId:[0-9a-fA-F-]{36}}"));
  }

  /**
   * Uses Spring's path-pattern matching for one method and explicit resources.
   *
   * @param method exact supported HTTP method
   * @param paths resource patterns, with no recursive administration exemption
   * @return matcher for these method/resource pairs
   */
  private RequestMatcher methods(HttpMethod method, String... paths) {
    return new OrRequestMatcher(
        java.util.Arrays.stream(paths)
            .map(
                path ->
                    (RequestMatcher) PathPatternRequestMatcher.withDefaults().matcher(method, path))
            .toList());
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
