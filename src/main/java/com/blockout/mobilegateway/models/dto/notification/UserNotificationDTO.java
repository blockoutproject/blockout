package com.blockout.mobilegateway.models.dto.notification;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserNotificationDTO {
    private Long id;

    @JsonProperty("user_id")
    private Long userId;

    private String type;
    private String title;
    private String body;

    @JsonProperty("deep_link")
    private String deepLink;

    @JsonProperty("target_type")
    private String targetType;

    @JsonProperty("target_id")
    private Long targetId;

    private JsonNode metadata;

    @JsonProperty("is_read")
    private Boolean isRead;

    @JsonProperty("is_opened")
    private Boolean isOpened;

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("read_at")
    private String readAt;

    @JsonProperty("opened_at")
    private String openedAt;
}