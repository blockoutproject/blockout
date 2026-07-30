package com.blockout.mobilegateway.config;

import com.blockout.mobilegateway.shared.infrastructure.security.Auth0ServiceTokenProvider;
import java.net.InetSocketAddress;
import java.net.Proxy;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.restclient.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.client.RestTemplate;

@Configuration
@RequiredArgsConstructor
public class RestTemplateConfig {

  private final FfvbProxyProperties proxyProperties;
  private final Auth0ServiceTokenProvider tokenManager;

  @Bean
  @Qualifier("internalAuthRestTemplate")
  public RestTemplate internalAuthRestTemplate(RestTemplateBuilder b) {
    return b.additionalInterceptors(bearerTokenFromSecurityContext())
        .connectTimeout(Duration.ofSeconds(5))
        .readTimeout(Duration.ofSeconds(15))
        .build();
  }

  @Bean
  @Qualifier("internalM2MRestTemplate")
  public RestTemplate internalM2MRestTemplate(RestTemplateBuilder b) {
    ClientHttpRequestInterceptor m2m =
        (req, body, ex) -> {
          String token = tokenManager.getAccessToken();
          if (token != null && !token.isBlank()) {
            req.getHeaders().setBearerAuth(token);
          }
          return ex.execute(req, body);
        };
    return b.additionalInterceptors(m2m)
        .connectTimeout(Duration.ofSeconds(5))
        .readTimeout(Duration.ofSeconds(15))
        .build();
  }

  @Bean
  @Qualifier("externalRestTemplate")
  public RestTemplate externalRestTemplate(RestTemplateBuilder builder) {
    Proxy proxy =
        new Proxy(
            Proxy.Type.HTTP,
            new InetSocketAddress(proxyProperties.getHost(), proxyProperties.getPort()));
    SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setProxy(proxy);

    return builder
        .requestFactory(() -> requestFactory)
        .additionalInterceptors(userAgentInterceptor("Blockout-MobileGateway/1.0"))
        .connectTimeout(Duration.ofSeconds(5))
        .readTimeout(Duration.ofSeconds(15))
        .build();
  }

  private ClientHttpRequestInterceptor bearerTokenFromSecurityContext() {
    return (request, body, execution) -> {
      Authentication auth = SecurityContextHolder.getContext().getAuthentication();
      if (auth instanceof JwtAuthenticationToken jwtAuth) {
        request.getHeaders().setBearerAuth(jwtAuth.getToken().getTokenValue());
      }
      return execution.execute(request, body);
    };
  }

  private ClientHttpRequestInterceptor userAgentInterceptor(String ua) {
    return (request, body, execution) -> {
      if (!request.getHeaders().containsHeader("User-Agent")) {
        request.getHeaders().add("User-Agent", ua);
      }
      return execution.execute(request, body);
    };
  }
}
