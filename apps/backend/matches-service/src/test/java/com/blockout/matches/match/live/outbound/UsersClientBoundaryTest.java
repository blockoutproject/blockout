package com.blockout.matches.match.live.outbound;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.matches.match.live.application.CurrentUserSnapshot;
import com.blockout.matches.usersclient.api.UserAccountsClient;
import com.blockout.matches.usersclient.model.UserAccountInternalResponse;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class UsersClientBoundaryTest {

    @Test
    void configuredVersionedUrlsNormalizeBeforeTheGeneratedV2Call() {
        assertThat(UsersServiceUrl.canonicalBasePath("https://users.example/api/v1/users"))
                .isEqualTo("https://users.example");
        assertThat(UsersServiceUrl.canonicalBasePath("https://users.example/api/v2/users/"))
                .isEqualTo("https://users.example");
        assertThat(UsersServiceUrl.canonicalBasePath("https://users.example"))
                .isEqualTo("https://users.example");
    }

    @Test
    void generatedResponseIsReducedImmediatelyToTheLivePolicySnapshot() {
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000007");
        Instant createdAt = Instant.parse("2026-07-01T10:00:00Z");
        UserAccountInternalResponse response = new UserAccountInternalResponse()
                .id(id)
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
