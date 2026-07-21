package com.blockout.mobilegateway.notification.api.models;

import com.blockout.mobilegateway.shared.application.models.NotificationTargetType;
import com.blockout.mobilegateway.shared.application.models.NotificationType;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Mobile notification view enriched with division data resolved by the gateway.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long id;

    private Long userId;

    private NotificationType type;
    private String title;
    private String body;

    private String deepLink;

    private NotificationTargetType targetType;

    private Long targetId;

    private JsonNode metadata;

    private Boolean isRead;

    private Boolean isOpened;

    private Instant createdAt;

    private Instant readAt;

    private Instant openedAt;

    private String divisionLogoUrl;
}
