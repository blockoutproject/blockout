package com.blockout.workersearch.team.outbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.shared.model.PageInfo;
import com.blockout.workersearch.team.application.TeamSnapshot;
import com.blockout.workersearch.teamsclient.api.TeamsClient;
import com.blockout.workersearch.teamsclient.invoker.ApiClient;
import com.blockout.workersearch.teamsclient.model.TeamInternalPageResponse;
import com.blockout.workersearch.teamsclient.model.TeamInternalResponse;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class TeamsServiceCatalogTest {

    @Test
    void aggregatesEveryCanonicalPageIntoImmutableApplicationSnapshots() {
        List<Integer> requestedPages = new ArrayList<>();
        TeamsClient client = new TeamsClient(new ApiClient()) {
            @Override
            public TeamInternalPageResponse listTeams(
                    Long divisionId, FormatEnum format, GenderEnum gender, String season, String clubId,
                    List<Long> ids, Boolean active, Integer page, Integer pageSize) {
                requestedPages.add(page);
                return new TeamInternalPageResponse().items(List.of(response((long) page + 1, "Team " + page)))
                        .pageInfo(new PageInfo(page, pageSize, page == 0).totalItems(2L));
            }
        };
        TeamsServiceCatalog catalog = new TeamsServiceCatalog(client, Mappers.getMapper(TeamSnapshotMapper.class));

        List<TeamSnapshot> teams = catalog.findActiveTeams();

        assertThat(requestedPages).containsExactly(0, 1);
        assertThat(teams).containsExactly(
                snapshot(1L, "Team 0"), snapshot(2L, "Team 1"));
        assertThat(teams).isUnmodifiable();
    }

    @Test
    void generatedClientCallsCanonicalV2PageWithBearerAuth() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().setBearerAuth("worker-token");
            return execution.execute(request, body);
        });
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        TeamsServiceCatalog catalog = new TeamsServiceCatalog(
                new TeamsClient(new ApiClient(restTemplate).setBasePath("https://teams.example")),
                Mappers.getMapper(TeamSnapshotMapper.class));

        server.expect(once(), requestTo(
                        "https://teams.example/api/v2/teams?active=true&page=0&pageSize=100"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer worker-token"))
                .andRespond(withSuccess("""
                        {"items":[{"id":1,"clubId":"club-1","rawName":"Raw","name":"Team",
                        "shortName":"TM","leagueCode":"L1","divisionId":2,"season":"2026",
                        "format":"SIX","gender":"M","followersCount":3,"logoUrl":"https://logo",
                        "active":true}],"pageInfo":{"page":0,"pageSize":100,"totalItems":1,"hasNext":false}}
                        """, MediaType.APPLICATION_JSON));

        assertThat(catalog.findActiveTeams()).containsExactly(snapshot(1L, "Team"));
        server.verify();
    }

    @Test
    void normalizesHostAndVersionedTeamUrls() {
        assertThat(TeamsServiceUrl.canonicalBasePath("https://teams.example/api/v1/teams/"))
                .isEqualTo("https://teams.example");
        assertThat(TeamsServiceUrl.canonicalBasePath("https://teams.example/api/v2/teams"))
                .isEqualTo("https://teams.example");
        assertThat(TeamsServiceUrl.canonicalBasePath("https://teams.example"))
                .isEqualTo("https://teams.example");
    }

    private TeamInternalResponse response(Long id, String name) {
        return new TeamInternalResponse().id(id).clubId("club-1").rawName("Raw").name(name).shortName("TM")
                .leagueCode("L1").divisionId(2L).season("2026").format(FormatEnum.SIX).gender(GenderEnum.M)
                .followersCount(3L).logoUrl("https://logo").active(true);
    }

    private TeamSnapshot snapshot(Long id, String name) {
        return new TeamSnapshot(id, name, "TM", "club-1", 2L, FormatEnum.SIX, GenderEnum.M,
                "2026", "https://logo");
    }
}
