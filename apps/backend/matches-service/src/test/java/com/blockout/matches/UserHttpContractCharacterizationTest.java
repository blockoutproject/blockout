package com.blockout.matches;

import com.blockout.matches.match.infrastructure.http.models.UserInternalResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Protects the complete User mirror consumed by match live-link moderation.
 */
class UserHttpContractCharacterizationTest {

    @Test
    void readsTheCompleteUserInternalResponse() throws Exception {
        UserInternalResponse user = new ObjectMapper().findAndRegisterModules().readValue("""
            {"id":1,"auth0Id":"auth0|1","email":"user@example.com","pseudo":"user",
             "firstName":"First","lastName":"Last","pictureUrl":"picture","phoneNumber":"phone",
             "active":true,"createdAt":"2026-07-19T12:00:00Z","lastUpdate":"2026-07-19T12:00:00Z",
             "favorites":[{"entityType":"POOL","entityId":2}]}
            """, UserInternalResponse.class);

        assertThat(user.auth0Id()).isEqualTo("auth0|1");
        assertThat(user.favorites()).hasSize(1);
        assertThat(user.createdAt()).isEqualTo(user.lastUpdate());
    }
}
