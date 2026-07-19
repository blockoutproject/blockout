package com.blockout.notifications.notification.api.models;

import com.blockout.notifications.notification.application.models.NotificationTargetType;
import com.blockout.notifications.notification.application.models.NotificationType;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

public record NotificationInternalResponse(
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
        Instant openedAt) {}
