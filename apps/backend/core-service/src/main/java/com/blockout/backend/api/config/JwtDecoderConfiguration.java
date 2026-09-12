package com.blockout.backend.api.config;

import java.time.Duration;
import org.springframework.context.annotation.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.client.RestTemplate;

@Configuration(proxyBeanMethods = false)
public class JwtDecoderConfiguration {
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
    var timestamps = new JwtTimestampValidator(Duration.ofSeconds(60));
    timestamps.setAllowEmptyExpiryClaim(false);
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(
            timestamps, new JwtIssuerValidator(properties.issuer()), audience));
    return token -> {
      try {
        return decoder.decode(token);
      } catch (JwtException failure) {
        // Provider failures may contain response bodies; the bearer boundary exposes only a safe
        // code.
        throw new BadJwtException("Token verification failed");
      }
    };
  }
}
