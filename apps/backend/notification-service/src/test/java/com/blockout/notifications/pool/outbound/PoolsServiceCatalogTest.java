package com.blockout.notifications.pool.outbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.blockout.notifications.pool.application.PoolNameSnapshot;
import com.blockout.notifications.poolsclient.api.PoolsClient;
import com.blockout.notifications.poolsclient.invoker.ApiClient;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class PoolsServiceCatalogTest {

    @Test
    void generatedClientUsesCanonicalReadAndImmediatelyProjectsTheName() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().setBearerAuth("service-token");
            return execution.execute(request, body);
        });
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        PoolsServiceCatalog catalog = new PoolsServiceCatalog(
                new PoolsClient(new ApiClient(restTemplate).setBasePath("https://pools.example")),
                Mappers.getMapper(PoolNameSnapshotMapper.class));

        server.expect(once(), requestTo("https://pools.example/api/v2/pools/7"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer service-token"))
                .andRespond(withSuccess("""
                        {"id":7,"poolCode":"P1","leagueCode":"L1","season":"2026",
                        "leagueName":"League","rawName":"Raw","name":"Pool","shortName":"PL",
                        "divisionId":2,"format":"SIX","gender":"M","followersCount":3,"active":true}
                        """, MediaType.APPLICATION_JSON));

        assertThat(catalog.getById(7L)).isEqualTo(new PoolNameSnapshot(7L, "Pool", 2L));
        server.verify();
    }

    @Test
    void normalizesLegacyAndCanonicalConfiguredUrls() {
        assertThat(PoolsServiceUrl.canonicalBasePath("https://pools.example/api/v1/pools/"))
                .isEqualTo("https://pools.example");
        assertThat(PoolsServiceUrl.canonicalBasePath("https://pools.example/api/v2/pools"))
                .isEqualTo("https://pools.example");
    }
}
