package com.blockout.pools.shared.api.v1;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import org.springframework.stereotype.Component;

@Component
public class LegacyPoolsJson {

    private final ObjectMapper mapper = JsonMapper.builder()
            .findAndAddModules()
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    public String write(Object value) throws JsonProcessingException {
        return mapper.writeValueAsString(value);
    }

    public <T> T read(String body, Class<T> type) throws JsonProcessingException {
        return mapper.readValue(body, type);
    }

    public JsonNode readTree(String body) throws JsonProcessingException {
        return mapper.readTree(body);
    }

    public <T> T convert(JsonNode node, Class<T> type) {
        return mapper.convertValue(node, type);
    }
}
