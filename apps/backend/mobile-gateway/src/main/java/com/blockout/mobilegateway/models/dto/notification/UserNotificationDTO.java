package com.blockout.mobilegateway.models.dto.notification;

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

    private Long userId;

    private String type;
    private String title;
    private String body;

    private String deepLink;

    private String targetType;

    private Long targetId;

    private JsonNode metadata;

    private Boolean isRead;

    private Boolean isOpened;

    private String createdAt;

    private String readAt;

    private String openedAt;
}
