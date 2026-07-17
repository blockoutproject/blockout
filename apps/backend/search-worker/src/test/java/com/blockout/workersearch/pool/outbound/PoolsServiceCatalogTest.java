package com.blockout.workersearch.pool.outbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.shared.model.PageInfo;
import com.blockout.workersearch.pool.application.PoolSnapshot;
import com.blockout.workersearch.poolsclient.api.PoolsClient;
import com.blockout.workersearch.poolsclient.invoker.ApiClient;
import com.blockout.workersearch.poolsclient.model.PoolInternalPageResponse;
import com.blockout.workersearch.poolsclient.model.PoolInternalResponse;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class PoolsServiceCatalogTest {

    @Test
    void aggregatesEveryCanonicalPageIntoImmutableApplicationSnapshots() {
        List<Integer> requestedPages = new ArrayList<>();
        PoolsClient client = new PoolsClient(new ApiClient()) {
            @Override
            public PoolInternalPageResponse listPools(
                    String leagueCode, String season, Boolean active, List<Long> ids, Integer page, Integer pageSize) {
                requestedPages.add(page);
                return new PoolInternalPageResponse().items(List.of(response((long) page + 1, "Pool " + page)))
                        .pageInfo(new PageInfo(page, pageSize, page == 0).totalItems(2L));
            }
        };
        PoolsServiceCatalog catalog = new PoolsServiceCatalog(client, Mappers.getMapper(PoolSnapshotMapper.class));

        List<PoolSnapshot> pools = catalog.findActivePools();

        assertThat(requestedPages).containsExactly(0, 1);
        assertThat(pools).containsExactly(snapshot(1L, "Pool 0"), snapshot(2L, "Pool 1"));
        assertThat(pools).isUnmodifiable();
    }

    @Test
    void generatedClientCallsCanonicalV2PageWithBearerAuth() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().setBearerAuth("worker-token");
            return execution.execute(request, body);
        });
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        PoolsServiceCatalog catalog = new PoolsServiceCatalog(
                new PoolsClient(new ApiClient(restTemplate).setBasePath("https://pools.example")),
                Mappers.getMapper(PoolSnapshotMapper.class));

        server.expect(once(), requestTo("https://pools.example/api/v2/pools?active=true&page=0&pageSize=100"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer worker-token"))
                .andRespond(withSuccess("""
                        {"items":[{"id":1,"poolCode":"P1","leagueCode":"L1","season":"2026",
                        "leagueName":"League","rawName":"Raw","name":"Pool","shortName":"PL",
                        "divisionId":2,"format":"SIX","gender":"M","followersCount":3,"active":true}],
                        "pageInfo":{"page":0,"pageSize":100,"totalItems":1,"hasNext":false}}
                        """, MediaType.APPLICATION_JSON));

        assertThat(catalog.findActivePools()).containsExactly(snapshot(1L, "Pool"));
        server.verify();
    }

    @Test
    void normalizesHostAndVersionedPoolUrls() {
        assertThat(PoolsServiceUrl.canonicalBasePath("https://pools.example/api/v1/pools/"))
                .isEqualTo("https://pools.example");
        assertThat(PoolsServiceUrl.canonicalBasePath("https://pools.example/api/v2/pools"))
                .isEqualTo("https://pools.example");
        assertThat(PoolsServiceUrl.canonicalBasePath("https://pools.example"))
                .isEqualTo("https://pools.example");
    }

    @Test
    void legacyEventProjectionPreservesNullableClassificationEnums() {
        PoolSnapshot snapshot = new PoolSnapshot(1L, "Pool", "PL", 2L, "L1", "League", "2026", null, null);

        var event = new PoolSnapshotEventProjector().project(snapshot);

        assertThat(event.getFormat()).isNull();
        assertThat(event.getGender()).isNull();
    }

    private PoolInternalResponse response(Long id, String name) {
        return new PoolInternalResponse().id(id).poolCode("P1").leagueCode("L1").season("2026")
                .leagueName("League").rawName("Raw").name(name).shortName("PL").divisionId(2L)
                .format(FormatEnum.SIX).gender(GenderEnum.M).followersCount(3L).active(true);
    }

    private PoolSnapshot snapshot(Long id, String name) {
        return new PoolSnapshot(id, name, "PL", 2L, "L1", "League", "2026", FormatEnum.SIX, GenderEnum.M);
    }
}
