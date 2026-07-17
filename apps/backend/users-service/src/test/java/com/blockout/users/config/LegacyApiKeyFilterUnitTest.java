package com.blockout.users.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** Verifies that the isolated v1 API-key filter retains its exact wire behavior. */
@DisplayName("Legacy API key filter")
class LegacyApiKeyFilterUnitTest {

    /** Proves the missing-key response remains the deployed plain-text body. */
    @Test
    @DisplayName("retains the missing API key response")
    void retainsMissingApiKeyResponse() throws Exception {
        SecurityConfig.ApiKeyFilter filter = filter("expected-key");
        MockHttpServletRequest request = new MockHttpServletRequest(
                "POST", "/api/v1/users/internal/auth0%7Cowner/assign-default-role");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
            throw new AssertionError("The protected controller must not execute.");
        });

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).isEqualTo("Missing API Key");
    }

    /** Proves the invalid-key response remains distinct from the missing-key response. */
    @Test
    @DisplayName("retains the invalid API key response")
    void retainsInvalidApiKeyResponse() throws Exception {
        SecurityConfig.ApiKeyFilter filter = filter("expected-key");
        MockHttpServletRequest request = new MockHttpServletRequest(
                "POST", "/api/v1/users/internal/auth0%7Cowner/assign-default-role");
        request.addHeader("X-API-KEY", "wrong-key");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
            throw new AssertionError("The protected controller must not execute.");
        });

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).isEqualTo("Invalid API Key");
    }

    /** Proves only the exact configured key reaches the retained v1 operation. */
    @Test
    @DisplayName("accepts the exact configured API key")
    void acceptsExactConfiguredApiKey() throws Exception {
        SecurityConfig.ApiKeyFilter filter = filter("expected-key");
        MockHttpServletRequest request = new MockHttpServletRequest(
                "POST", "/api/v1/users/internal/auth0%7Cowner/assign-default-role");
        request.addHeader("X-API-KEY", "expected-key");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean invoked = new AtomicBoolean();

        filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> invoked.set(true));

        assertThat(invoked).isTrue();
        assertThat(response.getStatus()).isEqualTo(200);
    }

    /** Creates the retained filter with the exact configured key. */
    private SecurityConfig.ApiKeyFilter filter(String apiKey) {
        AuthProperties properties = new AuthProperties();
        properties.setApiKey(apiKey);
        return new SecurityConfig.ApiKeyFilter(properties);
    }
}
