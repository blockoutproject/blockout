package com.blockout.mobilegateway.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Verifies that browser access is limited to the explicitly configured local origins. */
class SecurityConfigUnitTest {

    @Test
    void configuresOnlyDeclaredOriginsAndRequiredHeaders() {
        CorsConfigurationSource source = new SecurityConfig().corsConfigurationSource(
            "http://localhost:19006, http://localhost:8081"
        );
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/v1/mobile/secure/users/me");

        CorsConfiguration configuration = source.getCorsConfiguration(request);

        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowedOrigins())
            .containsExactly("http://localhost:19006", "http://localhost:8081");
        assertThat(configuration.getAllowedMethods())
            .containsExactly("GET", "POST", "PUT", "DELETE", "OPTIONS");
        assertThat(configuration.getAllowedHeaders())
            .containsExactly("Authorization", "Content-Type");
        assertThat(configuration.getAllowedOrigins()).doesNotContain("*");
    }

    @Test
    void deniesBrowserOriginsWhenNoneAreConfigured() {
        CorsConfigurationSource source = new SecurityConfig().corsConfigurationSource("");
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/v1/mobile/public/config/app");

        CorsConfiguration configuration = source.getCorsConfiguration(request);

        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowedOrigins()).isEqualTo(List.of());
    }
}
