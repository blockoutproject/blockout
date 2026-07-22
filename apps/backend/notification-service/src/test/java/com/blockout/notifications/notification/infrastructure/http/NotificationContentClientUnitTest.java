package com.blockout.notifications.notification.infrastructure.http;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.notification.infrastructure.http.contract.pool.models.PoolInternalResponse;
import com.blockout.notifications.notification.infrastructure.http.contract.team.models.TeamInternalResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Protects the generated transport mapping used to compose notifications. */
@DisplayName("Notification content clients")
class NotificationContentClientUnitTest {

    @Test
    @DisplayName("maps the generated Team response to the required notification view")
    void mapsGeneratedTeamResponse() {
        ApiClientProperties properties = properties();
        InternalApiClient apiClient = mock(InternalApiClient.class);
        TeamInternalResponse response = new TeamInternalResponse().shortName("BO");
        when(apiClient.getService("http://teams/10", TeamInternalResponse.class))
            .thenReturn(ResponseEntity.ok(response));

        var result = new TeamHttpClient(properties, apiClient).getTeamById(10L);

        assertThat(result.shortName()).isEqualTo("BO");
    }

    @Test
    @DisplayName("maps the generated Pool response to the required notification view")
    void mapsGeneratedPoolResponse() {
        ApiClientProperties properties = properties();
        InternalApiClient apiClient = mock(InternalApiClient.class);
        PoolInternalResponse response = new PoolInternalResponse().name("Elite").divisionId(20L);
        when(apiClient.getService("http://pools/30", PoolInternalResponse.class))
            .thenReturn(ResponseEntity.ok(response));

        var result = new PoolHttpClient(properties, apiClient).getPoolById(30L);

        assertThat(result.name()).isEqualTo("Elite");
        assertThat(result.divisionId()).isEqualTo(20L);
    }

    /** Creates the endpoint configuration used by both adapter tests. */
    private static ApiClientProperties properties() {
        ApiClientProperties properties = new ApiClientProperties();
        properties.getTeam().setUrl("http://teams");
        properties.getPool().setUrl("http://pools");
        return properties;
    }
}
