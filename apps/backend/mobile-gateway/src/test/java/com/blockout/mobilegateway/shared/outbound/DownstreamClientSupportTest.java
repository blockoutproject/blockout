package com.blockout.mobilegateway.shared.outbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.client.HttpClientErrorException;

class DownstreamClientSupportTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void derivesCanonicalRootFromLegacyAndCanonicalServiceUrls() {
        assertThat(DownstreamClientSupport.canonicalRoot("https://config.example/api/v1/config"))
                .isEqualTo("https://config.example");
        assertThat(DownstreamClientSupport.canonicalRoot("https://config.example/api/v2/config/"))
                .isEqualTo("https://config.example");
        assertThat(DownstreamClientSupport.canonicalRoot("https://config.example"))
                .isEqualTo("https://config.example");
    }

    @Test
    void selectsUserTransportOnlyForAnAuthenticatedJwt() {
        assertThat(DownstreamClientSupport.hasUserJwt()).isFalse();

        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("sub", "auth0|user")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new JwtAuthenticationToken(jwt, List.of(new SimpleGrantedAuthority("SCOPE_read:user"))));

        assertThat(DownstreamClientSupport.hasUserJwt()).isTrue();
    }

    @Test
    void convertsOnlyNotFoundResponsesToNullableLookupResults() {
        HttpClientErrorException notFound = error(HttpStatus.NOT_FOUND);
        HttpClientErrorException forbidden = error(HttpStatus.FORBIDDEN);

        String nullable = DownstreamClientSupport.nullableWhenNotFound(() -> { throw notFound; });
        assertThat(nullable).isNull();
        assertThatThrownBy(() -> DownstreamClientSupport.nullableWhenNotFound(() -> { throw forbidden; }))
                .isSameAs(forbidden);
    }

    private static HttpClientErrorException error(HttpStatus status) {
        return HttpClientErrorException.create(
                status, status.getReasonPhrase(), HttpHeaders.EMPTY, new byte[0], StandardCharsets.UTF_8);
    }
}
