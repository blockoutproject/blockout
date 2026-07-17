package com.blockout.matches.match.live.outbound;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.matches.match.live.application.CurrentUserSnapshot;
import com.blockout.matches.usersclient.api.UserAccountsClient;
import com.blockout.matches.usersclient.model.UserAccountInternalResponse;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Verifies URL normalization and immediate generated-user projection. */
@DisplayName("Generated users-service client boundary")
class UsersClientBoundaryTest {

    /** Proves both coexistence route suffixes normalize to the generated client base URL. */
    @Test
    @DisplayName("normalizes configured v1 and v2 user URLs")
    void configuredVersionedUrlsNormalizeBeforeTheGeneratedV2Call() {
        assertThat(UsersServiceUrl.canonicalBasePath("https://users.example/api/v1/users"))
                .isEqualTo("https://users.example");
        assertThat(UsersServiceUrl.canonicalBasePath("https://users.example/api/v2/users/"))
                .isEqualTo("https://users.example");
        assertThat(UsersServiceUrl.canonicalBasePath("https://users.example"))
                .isEqualTo("https://users.example");
    }

    /** Proves generated transport data does not escape the outbound adapter. */
    @Test
    @DisplayName("reduces the generated account to the live-policy snapshot")
    void generatedResponseIsReducedImmediatelyToTheLivePolicySnapshot() {
        Instant createdAt = Instant.parse("2026-07-01T10:00:00Z");
        UserAccountInternalResponse response = new UserAccountInternalResponse()
                .id(7L)
                .auth0Id("auth0|owner")
                .email("owner@example.com")
                .pseudo("owner")
                .createdAt(createdAt);
        UserAccountsClient generatedClient = new UserAccountsClient() {
            @Override
            public UserAccountInternalResponse getCurrentUser() {
                return response;
            }
        };

        CurrentUserSnapshot snapshot = new GeneratedCurrentUserAdapter(generatedClient).getCurrentUser();

        assertThat(snapshot).isEqualTo(new CurrentUserSnapshot("auth0|owner", createdAt));
    }
}
