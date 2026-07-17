package com.blockout.users.favorite.outbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withNoContent;

import com.blockout.users.teamsclient.api.TeamFollowersClient;
import com.blockout.users.teamsclient.invoker.ApiClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class TeamsServiceFollowerProjectionTest {

    @Test
    void generatedClientUsesCanonicalCamelCaseFollowerMutationAndForwardedBearer() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().setBearerAuth("user-token");
            return execution.execute(request, body);
        });
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        TeamsServiceFollowerProjection projection = new TeamsServiceFollowerProjection(
                new TeamFollowersClient(new ApiClient(restTemplate).setBasePath("https://teams.example")));

        server.expect(once(), requestTo(
                        "https://teams.example/api/v2/teams/7/followers/increment?userId=9"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer user-token"))
                .andRespond(withNoContent());

        projection.increment(7L, 9L);
        server.verify();
    }

    @Test
    void normalizesLegacyAndCanonicalConfiguredUrls() {
        assertThat(TeamsServiceUrl.canonicalBasePath("https://teams.example/api/v1/teams/"))
                .isEqualTo("https://teams.example");
        assertThat(TeamsServiceUrl.canonicalBasePath("https://teams.example/api/v2/teams"))
                .isEqualTo("https://teams.example");
    }
}
