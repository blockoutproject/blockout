package com.blockout.notifications.inbox.application;

import com.blockout.shared.model.NotificationTargetTypeEnum;
import com.blockout.shared.model.NotificationTypeEnum;
import com.fasterxml.jackson.databind.JsonNode;

/** Captures one provider-neutral notification inbox write. */
public record CreateInboxNotificationCommand(
        Long userId,
        NotificationTypeEnum type,
        String title,
        String body,
        String deepLink,
        NotificationTargetTypeEnum targetType,
        Long targetId,
        JsonNode metadata) {

    /** Defensively owns metadata before persistence. */
    public CreateInboxNotificationCommand {
        metadata = metadata == null ? null : metadata.deepCopy();
    }

    /** Prevents orchestration code from mutating the planned metadata. */
    @Override
    public JsonNode metadata() {
        return metadata == null ? null : metadata.deepCopy();
    }
}
