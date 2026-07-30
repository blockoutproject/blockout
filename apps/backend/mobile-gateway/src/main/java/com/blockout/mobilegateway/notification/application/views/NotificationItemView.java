package com.blockout.mobilegateway.notification.application.views;

import com.blockout.mobilegateway.shared.application.models.NotificationTargetType;
import com.blockout.mobilegateway.shared.application.models.NotificationType;
import java.time.Instant;
import tools.jackson.databind.JsonNode;

/** Transport-independent notification data used by gateway enrichment. */
public record NotificationItemView(
    Long id,
    Long userId,
    NotificationType type,
    String title,
    String body,
    String deepLink,
    NotificationTargetType targetType,
    Long targetId,
    JsonNode metadata,
    Boolean isRead,
    Boolean isOpened,
    Instant createdAt,
    Instant readAt,
    Instant openedAt,
    String divisionLogoUrl) {}
