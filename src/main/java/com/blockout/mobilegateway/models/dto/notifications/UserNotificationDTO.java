package com.blockout.mobilegateway.models.dto.notifications;

import com.fasterxml.jackson.annotation.JsonProperty;

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

    @JsonProperty("userId")
    private Long userId;

    private String type;
    private String title;
    private String body;

    @JsonProperty("deepLink")
    private String deepLink;

    @JsonProperty("targetType")
    private String targetType;

    @JsonProperty("targetId")
    private Long targetId;

    private String metadata;

    @JsonProperty("isRead")
    private Boolean isRead;

    @JsonProperty("isOpened")
    private Boolean isOpened;

    @JsonProperty("createdAt")
    private String createdAt;

    @JsonProperty("updatedAt")
    private String readAt;

    @JsonProperty("openedAt")
    private String openedAt;
}