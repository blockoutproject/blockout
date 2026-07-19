package com.blockout.notifications.notification.infrastructure.providers.expo;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * Message interne. On garde userId/matchId pour corrélation, non envoyés à Expo.
 */
@Data
@Builder
public class ExpoMessage {
    private String to;
    private String title;
    private String body;
    private Map<String, Object> data;
    @JsonIgnore private Long userId;
    @JsonIgnore private Long matchId;
}
