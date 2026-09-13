package com.blockout.backend.api.config;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.context.annotation.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.client.RestTemplate;

/** Wires bounded JWKS retrieval and standard validation for the configured JWT trust boundary. */
@Configuration(proxyBeanMethods = false)
public class JwtDecoderConfiguration {
  /**
   * Creates bounded JWKS transport without redirects; Spring closes the client on shutdown.
   *
   * @return the application-owned JDK HTTP client
   */
  @Bean
  HttpClient jwksHttpClient() {
    return HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(3))
        .followRedirects(HttpClient.Redirect.NEVER)
        .build();
  }

  /**
   * Creates an RS256 decoder with required expiry, issuer, audience and sixty-second clock skew.
   * JWKS failures become a safe BadJwtException without provider response content.
   *
   * @param properties validated issuer, audience and key-set configuration
   * @param jwksHttpClient bounded application-owned key retrieval transport
   * @return the decoder used by Spring bearer authentication
   */
  @Bean
  JwtDecoder decoder(AuthProperties properties, HttpClient jwksHttpClient) {
    var factory = new JdkClientHttpRequestFactory(jwksHttpClient);
    factory.setReadTimeout(Duration.ofSeconds(3));
    var decoder =
        NimbusJwtDecoder.withJwkSetUri(properties.jwkSetUri())
            .jwsAlgorithm(SignatureAlgorithm.RS256)
            .restOperations(new RestTemplate(factory))
            .build();
    var timestamps = new JwtTimestampValidator(Duration.ofSeconds(60));
    timestamps.setAllowEmptyExpiryClaim(false);
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(
            timestamps,
            new JwtIssuerValidator(properties.issuer()),
            new JwtAudienceValidator(properties.audience())));
    return token -> {
      try {
        return decoder.decode(token);
      } catch (JwtException _) {
        // Provider failures may contain response bodies; the bearer boundary exposes only a safe
        // code.
        throw new BadJwtException("Token verification failed");
      }
    };
  }
}
