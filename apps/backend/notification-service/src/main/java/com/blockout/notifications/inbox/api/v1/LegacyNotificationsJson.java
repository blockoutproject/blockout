package com.blockout.notifications.inbox.api.v1;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import org.springframework.stereotype.Component;

/** Isolates notification v1 snake-case JSON from canonical and provider transports. */
@Component
public class LegacyNotificationsJson {

    private final ObjectMapper mapper;

    /** Copies the application mapper so legacy casing cannot affect canonical routes. */
    public LegacyNotificationsJson(ObjectMapper objectMapper) {
        mapper = objectMapper.copy();
        mapper.setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
    }

    /** Serializes one retained inbox page. */
    public String write(LegacyNotificationPageResponse response) throws JsonProcessingException {
        return mapper.writeValueAsString(response);
    }

    /** Reads one retained push-token command. */
    public LegacyRegisterPushTokenRequest readPushToken(String json) throws JsonProcessingException {
        return mapper.readValue(json, LegacyRegisterPushTokenRequest.class);
    }
}
