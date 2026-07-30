package com.blockout.notifications.notification.application.views;

import com.blockout.notifications.notification.application.models.NotificationTargetType;
import com.blockout.notifications.notification.application.models.NotificationType;
import java.time.Instant;
import tools.jackson.databind.JsonNode;

/** Represents one user notification at the application boundary. */
public record NotificationView(
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
