package com.blockout.workersearch.configuration.division.outbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.blockout.workersearch.configclient.api.DivisionsClient;
import com.blockout.workersearch.configclient.invoker.ApiClient;
import com.blockout.workersearch.configclient.model.DivisionInternalListResponse;
import com.blockout.workersearch.configclient.model.DivisionInternalResponse;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class ConfigServiceDivisionCatalogTest {

    @Test
    void mapsGeneratedModelsImmediatelyToImmutableSnapshots() {
        DivisionsClient client = new DivisionsClient(new ApiClient()) {
            @Override
            public DivisionInternalListResponse listDivisions() {
                return new DivisionInternalListResponse().items(List.of(new DivisionInternalResponse()
                        .id(7L)
                        .name("Elite")
                        .mainColor("#1")
                        .firstGradientColor("#2")
                        .secondGradientColor("#3")
                        .thirdGradientColor("#4")
                        .logoUrl("https://logo")
                        .active(true)
                        .revision(9L)));
            }
        };
        ConfigServiceDivisionCatalog catalog = new ConfigServiceDivisionCatalog(
                client, Mappers.getMapper(ConfigDivisionMapper.class));

        var snapshots = catalog.findAll();

        assertThat(snapshots).containsExactly(new com.blockout.workersearch.configuration.division.application.DivisionSnapshot(
                7L, "Elite", "#1", "#2", "#3", "#4", "https://logo", true, 9L));
    }

    @Test
    void generatedClientCallsTheCanonicalV2RouteWithBearerAuth() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().setBearerAuth("worker-token");
            return execution.execute(request, body);
        });
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        DivisionsClient client = new DivisionsClient(new ApiClient(restTemplate).setBasePath("https://config.example"));

        server.expect(once(), requestTo("https://config.example/api/v2/config/divisions"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer worker-token"))
                .andRespond(withSuccess("""
                        {"items":[{"id":7,"name":"Elite","mainColor":"#1","firstGradientColor":"#2",
                        "secondGradientColor":"#3","thirdGradientColor":"#4","logoUrl":null,"active":true,
                        "revision":9}]}
                        """, MediaType.APPLICATION_JSON));

        assertThat(client.listDivisions().getItems()).singleElement()
                .extracting(DivisionInternalResponse::getRevision)
                .isEqualTo(9L);
        server.verify();
    }

    @Test
    void normalizesHostAndVersionedConfigUrls() {
        assertThat(ConfigServiceUrl.canonicalBasePath("https://config.example/api/v1/config/"))
                .isEqualTo("https://config.example");
        assertThat(ConfigServiceUrl.canonicalBasePath("https://config.example/api/v2/config"))
                .isEqualTo("https://config.example");
        assertThat(ConfigServiceUrl.canonicalBasePath("https://config.example"))
                .isEqualTo("https://config.example");
    }
}
