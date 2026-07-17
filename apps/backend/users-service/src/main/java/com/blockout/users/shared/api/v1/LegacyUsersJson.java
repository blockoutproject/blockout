package com.blockout.users.shared.api.v1;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import org.springframework.stereotype.Component;

/** Owns snake_case JSON exclusively for the isolated users v1 transport. */
@Component
public class LegacyUsersJson {

    private final ObjectMapper mapper = JsonMapper.builder()
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .findAndAddModules()
            .build();

    /** Reads one legacy snake_case multipart JSON part. */
    public <T> T read(String body, Class<T> type) throws JsonProcessingException {
        return mapper.readValue(body, type);
    }

    /** Writes one legacy response with the retained snake_case field names. */
    public String write(Object value) throws JsonProcessingException {
        return mapper.writeValueAsString(value);
    }
}
