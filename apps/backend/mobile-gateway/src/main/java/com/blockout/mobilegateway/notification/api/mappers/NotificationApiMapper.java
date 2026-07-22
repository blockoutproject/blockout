package com.blockout.mobilegateway.notification.api.mappers;

import com.blockout.mobilegateway.api.models.NotificationPageResponse;
import com.blockout.mobilegateway.api.models.NotificationResponse;
import com.blockout.mobilegateway.api.models.RegisterPushTokenRequest;
import com.blockout.mobilegateway.api.models.UnreadCountResponse;
import com.blockout.mobilegateway.notification.application.commands.RegisterPushTokenCommand;
import com.blockout.mobilegateway.notification.application.views.NotificationItemView;
import com.blockout.mobilegateway.notification.application.views.NotificationPageView;
import com.blockout.mobilegateway.notification.application.views.UnreadCountView;
import com.blockout.mobilegateway.shared.application.models.DevicePlatform;
import com.blockout.shared.model.NotificationTargetTypeEnum;
import com.blockout.shared.model.NotificationTypeEnum;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;

/** Maps Notification application data to the generated mobile API contract. */
@Component
@RequiredArgsConstructor
public class NotificationApiMapper {

    private final ObjectMapper objectMapper;

    /**
     * Maps an application notification page to the public response.
     *
     * @param source application notification page.
     * @return generated public page response.
     */
    public NotificationPageResponse toResponse(
            NotificationPageView source) {
        return new NotificationPageResponse(
            source.notifications().stream().map(this::toResponse).toList(), source.hasNext())
            .nextPage(source.nextPage());
    }

    /**
     * Maps one application notification for nested page conversion.
     *
     * @param source application notification view.
     * @return generated public notification response.
     */
    private NotificationResponse toResponse(
            NotificationItemView source) {
        return new NotificationResponse(
            source.id(), source.userId(), NotificationTypeEnum.valueOf(source.type().name()),
            source.title(), source.body(), source.isRead(), source.isOpened(), source.createdAt())
            .deepLink(source.deepLink())
            .targetType(source.targetType() == null
                ? null
                : NotificationTargetTypeEnum.valueOf(source.targetType().name()))
            .targetId(source.targetId())
            .metadata(source.metadata() == null
                ? null
                : objectMapper.convertValue(source.metadata(), new TypeReference<Map<String, Object>>() {}))
            .readAt(source.readAt())
            .openedAt(source.openedAt())
            .divisionLogoUrl(source.divisionLogoUrl());
    }

    /**
     * Maps a public push-token request to the application command.
     *
     * @param source generated public request.
     * @return application registration command.
     */
    public RegisterPushTokenCommand toCommand(RegisterPushTokenRequest source) {
        return new RegisterPushTokenCommand(
            source.getExpoPushToken(), DevicePlatform.valueOf(source.getPlatform().name()), source.getDeviceId());
    }

    /**
     * Maps the unread-count view to the public response.
     *
     * @param source application unread-count view.
     * @return generated public response.
     */
    public UnreadCountResponse toResponse(
            UnreadCountView source) {
        return new UnreadCountResponse(source.unread());
    }
}
