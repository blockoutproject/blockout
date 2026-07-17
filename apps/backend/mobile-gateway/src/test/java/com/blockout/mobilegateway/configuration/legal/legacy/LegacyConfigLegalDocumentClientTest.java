package com.blockout.mobilegateway.configuration.legal.legacy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.services.clients.ApiClientService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class LegacyConfigLegalDocumentClientTest {

    @Test
    void legacyAdapterKeepsV1PathAndCompleteSnakeCaseBody() {
        RestTemplate user = new RestTemplate();
        RestTemplate m2m = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(m2m).build();
        ApiClientProperties properties = new ApiClientProperties();
        properties.getConfig().setUrl("https://config.example");
        LegacyConfigLegalDocumentClient client = new LegacyConfigLegalDocumentClient(
                properties,
                new ApiClientService(user, m2m));

        server.expect(requestTo("https://config.example/api/v1/config/legal/privacy"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(
                        "{\"id\":7,\"type\":\"privacy\",\"title\":\"Privacy\",\"version\":\"1\","
                                + "\"content\":\"Body\",\"created_at\":\"2026-01-02T03:04:05\","
                                + "\"last_update\":\"2026-02-03T04:05:06\"}",
                        MediaType.APPLICATION_JSON));

        var response = client.getByType("privacy");

        assertThat(response.getId()).isEqualTo(7L);
        assertThat(response.getCreatedAt()).hasToString("2026-01-02T03:04:05");
        assertThat(response.getLastUpdate()).hasToString("2026-02-03T04:05:06");
        server.verify();
    }
}
