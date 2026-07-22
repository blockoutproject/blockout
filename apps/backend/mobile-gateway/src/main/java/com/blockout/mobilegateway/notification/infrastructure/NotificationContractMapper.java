package com.blockout.mobilegateway.notification.infrastructure;

import com.blockout.mobilegateway.notification.application.commands.RegisterPushTokenCommand;
import com.blockout.mobilegateway.notification.application.views.NotificationItemView;
import com.blockout.mobilegateway.notification.application.views.NotificationPageView;
import com.blockout.mobilegateway.notification.application.views.UnreadCountView;
import com.blockout.mobilegateway.notification.infrastructure.contract.models.NotificationInternalResponse;
import com.blockout.mobilegateway.notification.infrastructure.contract.models.NotificationPageInternalResponse;
import com.blockout.mobilegateway.notification.infrastructure.contract.models.RegisterPushTokenInternalRequest;
import com.blockout.mobilegateway.notification.infrastructure.contract.models.UnreadCountInternalResponse;
import com.blockout.mobilegateway.shared.application.models.NotificationTargetType;
import com.blockout.mobilegateway.shared.application.models.NotificationType;
import com.blockout.shared.model.DevicePlatformEnum;
import org.springframework.stereotype.Component;

/**
 * Maps generated Notification contracts at the gateway adapter boundary.
 */
@Component
public class NotificationContractMapper {

    /**
     * Converts a generated notification page into an application-owned view.
     */
    public NotificationPageView toView(NotificationPageInternalResponse page) {
        if (page == null) {
            return null;
        }
        return new NotificationPageView(
            page.getNotifications().stream().map(this::toView).toList(),
            page.getHasNext(),
            page.getNextPage());
    }

    /**
     * Converts a generated unread count to an application view.
     */
    public UnreadCountView toResponse(UnreadCountInternalResponse unreadCount) {
        return unreadCount == null ? null : new UnreadCountView(unreadCount.getUnread());
    }

    /**
     * Converts the application command to the generated internal request.
     */
    public RegisterPushTokenInternalRequest toInternalRequest(RegisterPushTokenCommand command) {
        return new RegisterPushTokenInternalRequest(
            command.expoPushToken(),
            DevicePlatformEnum.valueOf(command.platform().name()))
            .deviceId(command.deviceId());
    }

    private NotificationItemView toView(NotificationInternalResponse notification) {
        return new NotificationItemView(
            notification.getId(),
            notification.getUserId(),
            NotificationType.valueOf(notification.getType().name()),
            notification.getTitle(),
            notification.getBody(),
            notification.getDeepLink(),
            notification.getTargetType() == null
                ? null
                : NotificationTargetType.valueOf(notification.getTargetType().name()),
            notification.getTargetId(),
            notification.getMetadata(),
            notification.getIsRead(),
            notification.getIsOpened(),
            notification.getCreatedAt(),
            notification.getReadAt(),
            notification.getOpenedAt(),
            null);
    }
}
