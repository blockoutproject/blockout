package com.blockout.notifications.team.outbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.blockout.notifications.team.application.TeamNameSnapshot;
import com.blockout.notifications.teamsclient.api.TeamsClient;
import com.blockout.notifications.teamsclient.invoker.ApiClient;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class TeamsServiceCatalogTest {

    @Test
    void generatedClientUsesCanonicalReadAndImmediatelyProjectsTheName() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().setBearerAuth("service-token");
            return execution.execute(request, body);
        });
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        TeamsServiceCatalog catalog = new TeamsServiceCatalog(
                new TeamsClient(new ApiClient(restTemplate).setBasePath("https://teams.example")),
                Mappers.getMapper(TeamNameSnapshotMapper.class));

        server.expect(once(), requestTo("https://teams.example/api/v2/teams/7"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer service-token"))
                .andRespond(withSuccess("""
                        {"id":7,"clubId":"club-1","rawName":"Raw","name":"Team","shortName":"TM",
                        "leagueCode":"L1","divisionId":2,"season":"2026","format":"SIX","gender":"M",
                        "followersCount":3,"logoUrl":null,"active":true}
                        """, MediaType.APPLICATION_JSON));

        assertThat(catalog.getById(7L)).isEqualTo(new TeamNameSnapshot(7L, "TM"));
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
