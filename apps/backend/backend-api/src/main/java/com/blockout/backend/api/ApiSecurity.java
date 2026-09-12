package com.blockout.backend.api;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.security.autoconfigure.actuate.web.servlet.EndpointRequest;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.client.RestTemplate;

@Configuration(proxyBeanMethods = false)
@EnableMethodSecurity
public class ApiSecurity {
  @Bean
  JwtDecoder decoder(AuthProperties properties) {
    var factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(3));
    factory.setReadTimeout(Duration.ofSeconds(3));
    var decoder =
        NimbusJwtDecoder.withJwkSetUri(properties.jwkSetUri())
            .jwsAlgorithm(SignatureAlgorithm.RS256)
            .restOperations(new RestTemplate(factory))
            .build();
    OAuth2TokenValidator<Jwt> audience =
        jwt ->
            jwt.getAudience().contains(properties.audience())
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(
            new JwtTimestampValidator(Duration.ofSeconds(60)),
            new JwtIssuerValidator(properties.issuer()),
            audience));
    return token -> {
      try {
        return decoder.decode(token);
      } catch (JwtException failure) {
        throw new BadJwtException("Token verification failed");
      }
    };
  }

  @Bean
  @Order(1)
  SecurityFilterChain management(HttpSecurity http) throws Exception {
    return http.securityMatcher(EndpointRequest.toAnyEndpoint())
        .authorizeHttpRequests(a -> a.anyRequest().permitAll())
        .build();
  }

  @Bean
  SecurityFilterChain api(HttpSecurity http, List<ApiRoutePolicy> routes) throws Exception {
    return http.csrf(c -> c.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            a -> {
              routes.forEach(r -> r.configure(a));
              a.anyRequest().denyAll();
            })
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(
                        (request, response, error) ->
                            problem(response, 401, "AUTHENTICATION_REQUIRED"))
                    .accessDeniedHandler(
                        (request, response, error) -> problem(response, 403, "ACCESS_DENIED")))
        .oauth2ResourceServer(
            o ->
                o.jwt(j -> {})
                    .authenticationEntryPoint(
                        (request, response, error) ->
                            problem(response, 401, "AUTHENTICATION_REQUIRED")))
        .build();
  }

  private static void problem(
      jakarta.servlet.http.HttpServletResponse response, int status, String code)
      throws java.io.IOException {
    response.setStatus(status);
    response.setContentType("application/problem+json");
    if (status == 401) response.setHeader("WWW-Authenticate", "Bearer");
    response
        .getWriter()
        .write(
            "{\"type\":\"about:blank\",\"title\":\""
                + (status == 401 ? "Authentication required" : "Access denied")
                + "\",\"status\":"
                + status
                + ",\"code\":\""
                + code
                + "\"}");
  }
}
