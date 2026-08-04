package com.blockout.mobilegateway;

import com.blockout.mobilegateway.shared.infrastructure.security.Auth0ServiceTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** Verifies that mobile-gateway starts without contacting external Auth0 or downstream services. */
@SpringBootTest(
    properties = {
      "spring.security.oauth2.resourceserver.jwt.issuer-uri=https://example.invalid/",
      "spring.security.oauth2.resourceserver.jwt.audiences=unused",
      "auth0.domain=example.invalid",
      "auth0.client-id=unused",
      "auth0.client-secret=unused",
      "auth0.audience=unused",
      "auth0.token-refresh-delay=30s",
      "api.mobilegateway.url=http://127.0.0.1:1",
      "api.match.url=http://127.0.0.1:1",
      "api.team.url=http://127.0.0.1:1",
      "api.pool.url=http://127.0.0.1:1",
      "api.config.url=http://127.0.0.1:1",
      "api.competition.url=http://127.0.0.1:1",
      "api.club.url=http://127.0.0.1:1",
      "api.notification.url=http://127.0.0.1:1",
      "api.user.url=http://127.0.0.1:1",
      "api.search.url=http://127.0.0.1:1",
      "api.report.url=http://127.0.0.1:1",
      "proxy.host=127.0.0.1",
      "proxy.port=1",
      "pdf-link-token.secret=unused"
    })
@DisplayName("Mobile gateway application smoke")
class MobileGatewayApplicationSmokeTest {

  @MockitoBean Auth0ServiceTokenProvider auth0ServiceTokenProvider;

  @MockitoBean JwtDecoder jwtDecoder;

  /** Starts the complete Spring application context with controlled external boundaries. */
  @Test
  @DisplayName("starts the application context")
  void contextLoads() {}
}
