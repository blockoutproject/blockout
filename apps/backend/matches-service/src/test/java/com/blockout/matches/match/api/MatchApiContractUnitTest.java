package com.blockout.matches.match.api;

import com.blockout.matches.match.api.models.CreateMatchInternalRequest;
import com.blockout.matches.match.api.models.MatchInternalResponse;
import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Match API contract")
class MatchApiContractUnitTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    @DisplayName("exposes the complete Match shape in native camelCase")
    void exposesTheCompleteMatchResourceInNativeCamelCase() {
        Instant now = Instant.parse("2026-07-19T12:00:00Z");
        MatchInternalResponse response = new MatchInternalResponse(
            1L, "M1", "L1", 2L, 4L, 5L, now, "2026", MatchStatusEnum.FINISHED, true)
            .liveCode(3L)
            .set("3-0")
            .score("75-60")
            .venue("Gym")
            .firstReferee("Ref A")
            .secondReferee("Ref B")
            .createdAt(now)
            .lastUpdate(now)
            .liveUrl("https://youtube.com/live/1")
            .liveProvider(LiveProviderEnum.YOUTUBE)
            .liveOwnerAuth0Id("auth0|1");

        JsonNode json = objectMapper.valueToTree(response);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
            "id", "matchCode", "leagueCode", "poolId", "liveCode", "teamIdA", "teamIdB", "matchDate",
            "season", "set", "score", "status", "venue", "firstReferee", "secondReferee", "active",
            "createdAt", "lastUpdate", "liveUrl", "liveProvider", "liveOwnerAuth0Id");
        assertThat(json.path("liveProvider").asText()).isEqualTo("YOUTUBE");
    }

    @Test
    @DisplayName("keeps creation input separate from owner-managed fields")
    void keepsCreateInputSeparateFromOwnedResponseFields() throws Exception {
        CreateMatchInternalRequest request = objectMapper.readValue("""
            {"matchCode":"M1","leagueCode":"L1","poolId":2,"liveCode":3,
             "teamIdA":4,"teamIdB":5,"matchDate":"2026-07-19T12:00:00Z",
             "season":"2026","set":null,"score":null,"venue":"Gym",
             "firstReferee":null,"secondReferee":null,"active":true}
            """, CreateMatchInternalRequest.class);
        JsonNode json = objectMapper.valueToTree(request);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
            "matchCode", "leagueCode", "poolId", "liveCode", "teamIdA", "teamIdB", "matchDate",
            "season", "set", "score", "venue", "firstReferee", "secondReferee", "active");
        assertThat(json.has("id")).isFalse();
        assertThat(json.has("createdAt")).isFalse();
    }

    @Test
    @DisplayName("implements every generated Match API")
    void implementsEveryGeneratedMatchApi() {
        assertThat(MatchApi.class).isAssignableFrom(MatchController.class);
        assertThat(MatchLiveLinkApi.class).isAssignableFrom(MatchLiveLinkController.class);
        assertThat(MatchTestApi.class).isAssignableFrom(MatchTestController.class);
    }
}
