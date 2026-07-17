package com.blockout.mobilegateway.shared.api.v1;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import org.springframework.stereotype.Component;

/**
 * Owns the legacy mobile-gateway v1 JSON contract.
 *
 * <p>The application ObjectMapper remains canonical camelCase. Only explicit v1
 * inbound, outbound, and downstream adapters use this snake_case copy.</p>
 */
@Component
public final class LegacyMobileGatewayJson {

    private final ObjectMapper mapper;

    public LegacyMobileGatewayJson(ObjectMapper canonicalMapper) {
        this.mapper = canonicalMapper.copy()
                .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
    }

    public <T> T read(String body, Class<T> type) throws JsonProcessingException {
        return mapper.readValue(body, type);
    }

    public String write(Object value) throws JsonProcessingException {
        return mapper.writeValueAsString(value);
    }

    public JsonNode tree(Object value) {
        return mapper.valueToTree(value);
    }

    public ObjectMapper copyMapper() {
        return mapper.copy();
    }
}
