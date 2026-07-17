package com.blockout.notifications.push.api.v2;

import com.blockout.notifications.generated.model.RegisterPushTokenInternalRequest;
import com.blockout.notifications.push.application.RegisterPushTokenCommand;
import com.blockout.notifications.shared.mapping.NotificationMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Maps the generated registration request to the application command. */
@Mapper(config = NotificationMapperConfig.class)
public interface PushTokenApiMapper {

    @Mapping(target = "userId", source = "userId")
    @Mapping(target = "expoPushToken", source = "request.expoPushToken")
    @Mapping(target = "platform", source = "request.platform")
    @Mapping(target = "deviceId", source = "request.deviceId")
    RegisterPushTokenCommand toCommand(Long userId, RegisterPushTokenInternalRequest request);
}
