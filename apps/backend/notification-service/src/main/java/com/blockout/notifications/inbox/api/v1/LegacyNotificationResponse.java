package com.blockout.notifications.inbox.api.v1;

import com.blockout.shared.model.NotificationTargetTypeEnum;
import com.blockout.shared.model.NotificationTypeEnum;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

/** Carries the retained entity-shaped v1 notification item. */
public record LegacyNotificationResponse(
        Long id,
        Long userId,
        NotificationTypeEnum type,
        String title,
        String body,
        String deepLink,
        NotificationTargetTypeEnum targetType,
        Long targetId,
        JsonNode metadata,
        Boolean isRead,
        Boolean isOpened,
        Instant createdAt,
        Instant readAt,
        Instant openedAt) {
}
