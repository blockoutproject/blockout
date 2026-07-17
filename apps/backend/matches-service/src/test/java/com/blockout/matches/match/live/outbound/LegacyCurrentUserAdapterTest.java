package com.blockout.matches.match.live.outbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.blockout.matches.config.ApiClientProperties;
import com.blockout.matches.match.live.application.CurrentUserSnapshot;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class LegacyCurrentUserAdapterTest {

    @Test
    void temporaryAdapterReadsOnlyTheTwoRequiredSnakeCaseFields() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        ApiClientProperties properties = new ApiClientProperties();
        properties.getUser().setUrl("https://users.example/api/v1/users");
        server.expect(once(), requestTo("https://users.example/api/v1/users/me"))
                .andRespond(withSuccess(
                        "{\"id\":7,\"auth0_id\":\"auth0|owner\",\"created_at\":\"2026-07-01T10:00:00Z\",\"favorites\":[]}",
                        MediaType.APPLICATION_JSON));

        CurrentUserSnapshot snapshot = new LegacyCurrentUserAdapter(restTemplate, properties).getCurrentUser();

        assertThat(snapshot).isEqualTo(new CurrentUserSnapshot(
                "auth0|owner", Instant.parse("2026-07-01T10:00:00Z")));
        server.verify();
    }
}
