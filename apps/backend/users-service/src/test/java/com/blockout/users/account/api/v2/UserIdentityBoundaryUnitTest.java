package com.blockout.users.account.api.v2;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.users.config.AuthProperties;
import com.blockout.users.generated.api.UserIdentityApi;
import com.blockout.users.shared.api.v2.UsersProblemFactory;
import com.blockout.users.shared.api.v2.UsersSecurityProblemWriter;
import com.blockout.users.shared.security.CanonicalApiKeyFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** Verifies generated identity ownership and version-specific API-key behavior. */
@DisplayName("User identity boundary")
class UserIdentityBoundaryUnitTest {

    /** Proves the canonical controller implements the generated internal identity interface. */
    @Test
    @DisplayName("implements the generated identity interface")
    void implementsGeneratedIdentityInterface() {
        assertThat(UserIdentityApi.class).isAssignableFrom(UserIdentityV2Controller.class);
    }

    /** Proves a missing canonical API key returns stable Problem Details. */
    @Test
    @DisplayName("returns canonical Problem Details for a missing API key")
    void returnsCanonicalProblemDetailsForMissingApiKey() throws Exception {
        CanonicalApiKeyFilter filter = filter("expected-key");
        MockHttpServletRequest request = new MockHttpServletRequest(
                "POST", "/api/v2/users/internal/auth0%7Cowner/assign-default-role");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
            throw new AssertionError("The protected controller must not execute.");
        });

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentType()).isEqualTo("application/problem+json");
        assertThat(response.getContentAsString())
                .contains("\"code\":\"invalid_api_key\"")
                .contains("\"status\":401")
                .contains("\"requestId\"");
    }

    /** Proves the exact configured key continues to authorize the internal operation. */
    @Test
    @DisplayName("accepts the exact configured API key")
    void acceptsExactConfiguredApiKey() throws Exception {
        CanonicalApiKeyFilter filter = filter("expected-key");
        MockHttpServletRequest request = new MockHttpServletRequest(
                "POST", "/api/v2/users/internal/auth0%7Cowner/assign-default-role");
        request.addHeader("X-API-KEY", "expected-key");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean invoked = new AtomicBoolean();

        filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> invoked.set(true));

        assertThat(invoked).isTrue();
        assertThat(response.getStatus()).isEqualTo(200);
    }

    /** Creates the canonical filter with real Problem Details serialization. */
    private CanonicalApiKeyFilter filter(String apiKey) {
        AuthProperties properties = new AuthProperties();
        properties.setApiKey(apiKey);
        UsersSecurityProblemWriter problems = new UsersSecurityProblemWriter(
                new ObjectMapper().findAndRegisterModules(), new UsersProblemFactory());
        return new CanonicalApiKeyFilter(properties, problems);
    }
}
