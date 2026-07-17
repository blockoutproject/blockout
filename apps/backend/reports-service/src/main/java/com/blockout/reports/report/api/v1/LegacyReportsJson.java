package com.blockout.reports.report.api.v1;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import org.springframework.stereotype.Component;

/** Isolates the retained reports v1 snake-case JSON configuration. */
@Component
public class LegacyReportsJson {

    private final ObjectMapper mapper;

    /** Copies the application mapper so legacy casing cannot affect canonical routes. */
    public LegacyReportsJson(ObjectMapper objectMapper) {
        mapper = objectMapper.copy();
        mapper.setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
    }

    /** Reads one legacy report command from its multipart JSON string. */
    public LegacyReportRequest read(String json) throws JsonProcessingException {
        return mapper.readValue(json, LegacyReportRequest.class);
    }

    /** Writes one legacy provider-shaped response with exact snake-case keys. */
    public String write(LegacyReportResponse response) throws JsonProcessingException {
        return mapper.writeValueAsString(response);
    }
}
