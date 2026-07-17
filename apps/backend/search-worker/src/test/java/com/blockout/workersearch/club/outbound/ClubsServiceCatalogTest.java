package com.blockout.workersearch.club.outbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.blockout.shared.model.PageInfo;
import com.blockout.workersearch.club.application.ClubSnapshot;
import com.blockout.workersearch.clubsclient.api.ClubsClient;
import com.blockout.workersearch.clubsclient.invoker.ApiClient;
import com.blockout.workersearch.clubsclient.model.ClubInternalPageResponse;
import com.blockout.workersearch.clubsclient.model.ClubInternalResponse;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class ClubsServiceCatalogTest {

    @Test
    void aggregatesEveryCanonicalPageIntoImmutableMinimalSnapshots() {
        List<Integer> requestedPages = new ArrayList<>();
        ClubsClient client = new ClubsClient(new ApiClient()) {
            @Override
            public ClubInternalPageResponse listClubs(
                    List<String> ids,
                    Boolean active,
                    Integer page,
                    Integer pageSize) {
                requestedPages.add(page);
                ClubInternalResponse club = response("club-" + page, "Club " + page);
                return new ClubInternalPageResponse()
                        .items(List.of(club))
                        .pageInfo(new PageInfo(page, pageSize, page == 0).totalItems(2L));
            }
        };
        ClubsServiceCatalog catalog = new ClubsServiceCatalog(client, Mappers.getMapper(ClubSnapshotMapper.class));

        List<ClubSnapshot> clubs = catalog.findActiveClubs();

        assertThat(requestedPages).containsExactly(0, 1);
        assertThat(clubs).containsExactly(
                new ClubSnapshot("club-0", "Club 0", "https://logo", "Paris"),
                new ClubSnapshot("club-1", "Club 1", "https://logo", "Paris"));
        assertThat(clubs).isUnmodifiable();
    }

    @Test
    void generatedClientCallsCanonicalV2PageWithBearerAuth() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().setBearerAuth("worker-token");
            return execution.execute(request, body);
        });
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        ClubsClient client = new ClubsClient(new ApiClient(restTemplate).setBasePath("https://clubs.example"));
        ClubsServiceCatalog catalog = new ClubsServiceCatalog(client, Mappers.getMapper(ClubSnapshotMapper.class));

        server.expect(once(), requestTo(
                        "https://clubs.example/api/v2/clubs?active=true&page=0&pageSize=100"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer worker-token"))
                .andRespond(withSuccess("""
                        {"items":[{"id":"club-1","rawName":"Raw","name":"Club","address":null,
                        "city":"Paris","postalCode":"75001","email":null,"phoneNumber":null,"website":null,
                        "logoUrl":"https://logo","active":true,"latitude":null,"longitude":null}],
                        "pageInfo":{"page":0,"pageSize":100,"totalItems":1,"hasNext":false}}
                        """, MediaType.APPLICATION_JSON));

        assertThat(catalog.findActiveClubs()).containsExactly(
                new ClubSnapshot("club-1", "Club", "https://logo", "Paris"));
        server.verify();
    }

    @Test
    void normalizesHostAndVersionedClubUrls() {
        assertThat(ClubsServiceUrl.canonicalBasePath("https://clubs.example/api/v1/clubs/"))
                .isEqualTo("https://clubs.example");
        assertThat(ClubsServiceUrl.canonicalBasePath("https://clubs.example/api/v2/clubs"))
                .isEqualTo("https://clubs.example");
        assertThat(ClubsServiceUrl.canonicalBasePath("https://clubs.example"))
                .isEqualTo("https://clubs.example");
    }

    private ClubInternalResponse response(String id, String name) {
        return new ClubInternalResponse()
                .id(id)
                .rawName("Raw")
                .name(name)
                .address(null)
                .city("Paris")
                .postalCode("75001")
                .email(null)
                .phoneNumber(null)
                .website(null)
                .logoUrl("https://logo")
                .active(true)
                .latitude(null)
                .longitude(null);
    }
}
