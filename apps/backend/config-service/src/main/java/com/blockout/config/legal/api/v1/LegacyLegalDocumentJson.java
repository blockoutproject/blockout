package com.blockout.config.legal.api.v1;

import com.blockout.config.legal.application.LegalDocumentSnapshot;
import com.blockout.config.legal.application.UpdateLegalDocumentCommand;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
class LegacyLegalDocumentJson {

    private static final Logger LOGGER = LoggerFactory.getLogger(LegacyLegalDocumentJson.class);
    private final ObjectMapper mapper = JsonMapper.builder()
            .findAndAddModules()
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    String write(LegalDocumentSnapshot snapshot) throws JsonProcessingException {
        return mapper.writeValueAsString(new LegacyLegalDocumentResponse(
                snapshot.id(),
                snapshot.type(),
                snapshot.title(),
                snapshot.version(),
                snapshot.content(),
                snapshot.createdAt(),
                snapshot.lastUpdate()));
    }

    UpdateLegalDocumentCommand readUpdate(String body) throws JsonProcessingException {
        try {
            LegacyLegalDocumentUpdateRequest request = mapper.readValue(body, LegacyLegalDocumentUpdateRequest.class);
            return new UpdateLegalDocumentCommand(request.title(), request.version(), request.content());
        } catch (JsonProcessingException exception) {
            LOGGER.warn("Legacy legal document compatibility parse failed");
            throw exception;
        }
    }
}
