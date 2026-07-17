package com.blockout.notifications.inbox.api.v2;

import com.blockout.notifications.generated.model.NotificationInternalResponse;
import com.blockout.notifications.inbox.application.NotificationInboxSnapshot;
import com.blockout.notifications.shared.mapping.NotificationMapperConfig;
import org.mapstruct.Mapper;

/** Maps application-owned inbox snapshots to generated canonical models. */
@Mapper(config = NotificationMapperConfig.class)
public interface NotificationInboxApiMapper {

    /** Projects only the nine approved canonical notification fields. */
    NotificationInternalResponse toResponse(NotificationInboxSnapshot snapshot);
}
