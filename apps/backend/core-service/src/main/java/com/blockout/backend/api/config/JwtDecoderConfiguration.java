package com.blockout.backend.api.config;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.context.annotation.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.client.RestTemplate;

@Configuration(proxyBeanMethods = false)
public class JwtDecoderConfiguration {
  @Bean
  HttpClient jwksHttpClient() {
    return HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(3))
        .followRedirects(HttpClient.Redirect.NEVER)
        .build();
  }

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
