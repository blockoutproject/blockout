package com.blockout.notifications.notification.api.mappers;

import com.blockout.notifications.notification.api.models.NotificationInternalResponse;
import com.blockout.notifications.notification.api.models.NotificationPageInternalResponse;
import com.blockout.notifications.notification.api.models.RegisterPushTokenInternalRequest;
import com.blockout.notifications.notification.application.commands.RegisterPushTokenCommand;
import com.blockout.notifications.notification.application.views.NotificationPageView;
import com.blockout.notifications.notification.application.views.NotificationView;
import org.springframework.stereotype.Component;

@Component
public class NotificationApiMapper {

    public NotificationPageInternalResponse toResponse(NotificationPageView page) {
        return new NotificationPageInternalResponse(
            page.notifications().stream().map(this::toResponse).toList(),
            page.hasNext(),
            page.nextPage());
    }

    public RegisterPushTokenCommand toCommand(RegisterPushTokenInternalRequest request) {
        return new RegisterPushTokenCommand(request.expoPushToken(), request.platform(), request.deviceId());
    }

    private NotificationInternalResponse toResponse(NotificationView notification) {
        return new NotificationInternalResponse(
            notification.id(),
            notification.userId(),
            notification.type(),
            notification.title(),
            notification.body(),
            notification.deepLink(),
            notification.targetType(),
            notification.targetId(),
            notification.metadata(),
            notification.isRead(),
            notification.isOpened(),
            notification.createdAt(),
            notification.readAt(),
            notification.openedAt());
    }
}
