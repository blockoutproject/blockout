package com.blockout.matches;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.matches.match.infrastructure.http.contract.models.UserInternalResponse;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** Protects the complete User mirror consumed by match live-link moderation. */
class UserHttpContractCharacterizationTest {

  @Test
  void readsTheCompleteUserInternalResponse() throws Exception {
    UserInternalResponse user =
        JsonMapper.builder()
            .findAndAddModules()
            .build()
            .readValue(
                """
            {"id":1,"auth0Id":"auth0|1","email":"user@example.com","pseudo":"user",
             "firstName":"First","lastName":"Last","pictureUrl":"picture","phoneNumber":"phone",
             "active":true,"createdAt":"2026-07-19T12:00:00Z","lastUpdate":"2026-07-19T12:00:00Z",
             "favorites":[{"entityType":"POOL","entityId":2}]}
            """,
                UserInternalResponse.class);

    assertThat(user.getAuth0Id()).isEqualTo("auth0|1");
    assertThat(user.getFavorites()).hasSize(1);
    assertThat(user.getCreatedAt()).isEqualTo(user.getLastUpdate());
  }
}
