package com.blockout.users.favorite.outbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withNoContent;

import com.blockout.users.poolsclient.api.PoolFollowersClient;
import com.blockout.users.poolsclient.invoker.ApiClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class PoolsServiceFollowerProjectionTest {

    @Test
    void generatedClientUsesCanonicalCamelCaseFollowerMutationAndForwardedBearer() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().setBearerAuth("user-token");
            return execution.execute(request, body);
        });
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        PoolsServiceFollowerProjection projection = new PoolsServiceFollowerProjection(
                new PoolFollowersClient(new ApiClient(restTemplate).setBasePath("https://pools.example")));

        server.expect(once(), requestTo("https://pools.example/api/v2/pools/7/followers/increment?userId=9"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer user-token"))
                .andRespond(withNoContent());

        projection.increment(7L, 9L);
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
