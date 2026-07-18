package com.blockout.notifications.push.persistence;

import com.blockout.notifications.push.application.PushTokenRegistrationChange;
import com.blockout.notifications.push.application.PushTokenRegistrationTarget;
import com.blockout.notifications.push.application.RegisterPushTokenCommand;
import com.blockout.notifications.shared.mapping.NotificationMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

/** Maps application-owned registration decisions to push-token rows. */
@Mapper(config = NotificationMapperConfig.class)
public interface PushTokenPersistenceMapper {

    PushTokenRegistrationTarget toTarget(PushTokenEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "active", constant = "true")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    PushTokenEntity toEntity(RegisterPushTokenCommand command);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "active", constant = "true")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    void apply(PushTokenRegistrationChange change, @MappingTarget PushTokenEntity entity);
}
