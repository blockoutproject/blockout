package com.blockout.notifications.inbox.application;

import com.blockout.shared.model.NotificationTargetTypeEnum;
import com.blockout.shared.model.NotificationTypeEnum;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

/** Carries canonical inbox fields plus the temporary v1 compatibility projection. */
public record NotificationInboxSnapshot(
        Long id,
        Long userId,
        NotificationTypeEnum type,
        String title,
        String body,
        String deepLink,
        NotificationTargetTypeEnum targetType,
        Long targetId,
        JsonNode metadata,
        Long divisionId,
        Boolean isRead,
        Boolean isOpened,
        Instant createdAt,
        Instant readAt,
        Instant openedAt) {

    /** Defensively owns the compatibility metadata tree. */
    public NotificationInboxSnapshot {
        metadata = metadata == null ? null : metadata.deepCopy();
    }

    /** Prevents callers from mutating the stored compatibility metadata. */
    @Override
    public JsonNode metadata() {
        return metadata == null ? null : metadata.deepCopy();
    }
}
