package com.blockout.mobilegateway.configuration.legal.outbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.blockout.config.client.api.LegalDocumentsClient;
import com.blockout.config.client.invoker.ApiClient;
import com.blockout.config.client.model.UpdateLegalDocumentInternalRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class GeneratedLegalDocumentsClientTest {

    @Test
    void generatedClientUsesV2CamelCaseAndBearerTransport() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().setBearerAuth("forwarded-user-token");
            return execution.execute(request, body);
        });
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        LegalDocumentsClient client = new LegalDocumentsClient(
                new ApiClient(restTemplate).setBasePath("https://config.example"));

        server.expect(once(), requestTo("https://config.example/api/v2/config/legal/privacy"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer forwarded-user-token"))
                .andRespond(withSuccess(
                        "{\"type\":\"privacy\",\"title\":\"Privacy\",\"version\":\"2\",\"content\":\"Body\"}",
                        MediaType.APPLICATION_JSON));

        var response = client.getLegalDocument("privacy");

        assertThat(response.getType()).isEqualTo("privacy");
        assertThat(response.getTitle()).isEqualTo("Privacy");
        server.verify();
    }

    @Test
    void generatedUpdateKeepsCanonicalKeysAndNullPartialUpdateSemantics() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        LegalDocumentsClient client = new LegalDocumentsClient(
                new ApiClient(restTemplate).setBasePath("https://config.example"));
        var request = new UpdateLegalDocumentInternalRequest().title("Updated");

        server.expect(once(), requestTo("https://config.example/api/v2/config/legal/privacy"))
                .andExpect(method(HttpMethod.PUT))
                .andExpect(content().json("{\"title\":\"Updated\"}"))
                .andRespond(withSuccess(
                        "{\"type\":\"privacy\",\"title\":\"Updated\",\"version\":\"2\",\"content\":\"Body\"}",
                        MediaType.APPLICATION_JSON));

        var response = client.updateLegalDocument("privacy", request);

        assertThat(response.getTitle()).isEqualTo("Updated");
        server.verify();
    }
}
