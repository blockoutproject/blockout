package com.blockout.notifications.inbox.persistence;

import com.blockout.notifications.inbox.application.CreateInboxNotificationCommand;
import com.blockout.notifications.inbox.application.NotificationInboxSnapshot;
import com.blockout.notifications.shared.mapping.NotificationMapperConfig;
import com.fasterxml.jackson.databind.JsonNode;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Maps persistence-owned notifications to immutable application snapshots. */
@Mapper(config = NotificationMapperConfig.class)
public interface NotificationInboxPersistenceMapper {

    /** Maps every retained compatibility field and derives the canonical division identity. */
    @Mapping(target = "divisionId", expression = "java(divisionId(entity.getMetadata()))")
    NotificationInboxSnapshot toSnapshot(NotificationInboxEntity entity);

    /** Maps one provider-neutral write to a new unread and unopened persistence row. */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "isRead", constant = "false")
    @Mapping(target = "isOpened", constant = "false")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "readAt", ignore = true)
    @Mapping(target = "openedAt", ignore = true)
    NotificationInboxEntity toEntity(CreateInboxNotificationCommand command);

    /** Extracts the positive numeric or numeric-text division identity used by BFF enrichment. */
    default Long divisionId(JsonNode metadata) {
        if (metadata == null || metadata.isNull() || metadata.isMissingNode()) {
            return null;
        }
        JsonNode value = metadata.get("divisionId");
        if (value == null || value.isNull()) {
            return null;
        }
        long divisionId;
        if (value.isIntegralNumber()) {
            divisionId = value.asLong();
        } else if (value.isTextual()) {
            try {
                divisionId = Long.parseLong(value.asText());
            } catch (NumberFormatException exception) {
                return null;
            }
        } else {
            return null;
        }
        return divisionId > 0 ? divisionId : null;
    }
}
