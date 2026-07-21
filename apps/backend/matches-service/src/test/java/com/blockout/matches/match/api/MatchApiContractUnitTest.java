package com.blockout.matches.match.api;

import com.blockout.matches.match.api.models.CreateMatchInternalRequest;
import com.blockout.matches.match.api.models.MatchInternalResponse;
import com.blockout.matches.match.application.models.LiveProvider;
import com.blockout.matches.match.application.models.MatchStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class MatchApiContractUnitTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void exposesTheCompleteMatchResourceInNativeCamelCase() {
        Instant now = Instant.parse("2026-07-19T12:00:00Z");
        MatchInternalResponse response = new MatchInternalResponse(
            1L, "M1", "L1", 2L, 3L, 4L, 5L, now, "2026", "3-0", "75-60",
            MatchStatus.FINISHED, "Gym", "Ref A", "Ref B", true, now, now,
            "https://youtube.com/live/1", LiveProvider.YOUTUBE, "auth0|1");

        JsonNode json = objectMapper.valueToTree(response);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
            "id", "matchCode", "leagueCode", "poolId", "liveCode", "teamIdA", "teamIdB", "matchDate",
            "season", "set", "score", "status", "venue", "firstReferee", "secondReferee", "active",
            "createdAt", "lastUpdate", "liveUrl", "liveProvider", "liveOwnerAuth0Id");
        assertThat(json.path("liveProvider").asText()).isEqualTo("YOUTUBE");
    }

    @Test
    void keepsCreateInputSeparateFromOwnedResponseFields() {
        JsonNode json = objectMapper.valueToTree(new CreateMatchInternalRequest(
            "M1", "L1", 2L, 3L, 4L, 5L, Instant.parse("2026-07-19T12:00:00Z"),
            "2026", null, null, "Gym", null, null, true));

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
            "matchCode", "leagueCode", "poolId", "liveCode", "teamIdA", "teamIdB", "matchDate",
            "season", "set", "score", "venue", "firstReferee", "secondReferee", "active");
        assertThat(json.has("id")).isFalse();
        assertThat(json.has("createdAt")).isFalse();
    }
}
