package com.blockout.notifications.inbox.api.v1;

import com.blockout.notifications.inbox.application.NotificationInboxPage;
import com.blockout.notifications.inbox.application.NotificationInboxSnapshot;
import com.blockout.notifications.shared.mapping.NotificationMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Maps application inbox snapshots to the isolated v1 transport. */
@Mapper(config = NotificationMapperConfig.class)
public interface LegacyNotificationMapper {

    /** Retains every historically exposed notification field. */
    LegacyNotificationResponse toResponse(NotificationInboxSnapshot snapshot);

    /** Retains the deployed wrapper and derives its explicit continuation page. */
    @Mapping(target = "notifications", source = "items")
    @Mapping(target = "nextPage", expression = "java(page.hasNext() ? page.page() + 1 : null)")
    LegacyNotificationPageResponse toResponse(NotificationInboxPage page);
}
