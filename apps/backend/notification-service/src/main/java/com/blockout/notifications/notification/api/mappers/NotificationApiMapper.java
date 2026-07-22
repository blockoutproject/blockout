package com.blockout.notifications.notification.api.mappers;

import com.blockout.notifications.notification.api.models.NotificationInternalResponse;
import com.blockout.notifications.notification.api.models.NotificationPageInternalResponse;
import com.blockout.notifications.notification.api.models.RegisterPushTokenInternalRequest;
import com.blockout.notifications.notification.application.commands.RegisterPushTokenCommand;
import com.blockout.notifications.notification.application.views.NotificationPageView;
import com.blockout.notifications.notification.application.views.NotificationView;
import com.blockout.shared.model.NotificationTargetTypeEnum;
import com.blockout.shared.model.NotificationTypeEnum;
import org.springframework.stereotype.Component;

/**
 * Maps between generated Notification transport models and application-owned models.
 */
@Component
public class NotificationApiMapper {

    public NotificationPageInternalResponse toResponse(NotificationPageView page) {
        return new NotificationPageInternalResponse(
            page.notifications().stream().map(this::toResponse).toList(),
            page.hasNext())
            .nextPage(page.nextPage());
    }

    public RegisterPushTokenCommand toCommand(RegisterPushTokenInternalRequest request) {
        return new RegisterPushTokenCommand(
            request.getExpoPushToken(),
            com.blockout.notifications.notification.application.models.DevicePlatform.valueOf(
                request.getPlatform().name()),
            request.getDeviceId());
    }

    private NotificationInternalResponse toResponse(NotificationView notification) {
        return new NotificationInternalResponse(
            notification.id(),
            notification.userId(),
            NotificationTypeEnum.valueOf(notification.type().name()),
            notification.title(),
            notification.body(),
            NotificationTargetTypeEnum.valueOf(notification.targetType().name()),
            notification.isRead(),
            notification.isOpened(),
            notification.createdAt())
            .deepLink(notification.deepLink())
            .targetId(notification.targetId())
            .metadata(notification.metadata())
            .readAt(notification.readAt())
            .openedAt(notification.openedAt());
    }
}
