package com.blockout.matches.match.live.outbound;

import com.blockout.matches.config.ApiClientProperties;
import com.blockout.matches.match.live.application.CurrentUserProvider;
import com.blockout.matches.match.live.application.CurrentUserSnapshot;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/** Temporary v1 provider until users-service exposes its generated boundary in MRG-339. */
@Primary
@Component
public class LegacyCurrentUserAdapter implements CurrentUserProvider {

    private final RestTemplate restTemplate;
    private final ApiClientProperties properties;

    public LegacyCurrentUserAdapter(
            @Qualifier("forwardRestTemplate") RestTemplate restTemplate,
            ApiClientProperties properties) {
        this.restTemplate = restTemplate;
        this.properties = properties;
    }

    @Override
    public CurrentUserSnapshot getCurrentUser() {
        ResponseEntity<JsonNode> response = restTemplate.getForEntity(
                properties.getUser().getUrl() + "/me", JsonNode.class);
        JsonNode user = response.getBody();
        if (user == null || user.isNull()) {
            return null;
        }
        return new CurrentUserSnapshot(
                textOrNull(user, "auth0_id"),
                instantOrNull(user, "created_at"));
    }

    private String textOrNull(JsonNode source, String field) {
        JsonNode value = source.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private Instant instantOrNull(JsonNode source, String field) {
        String value = textOrNull(source, field);
        return value == null ? null : Instant.parse(value);
    }
}
