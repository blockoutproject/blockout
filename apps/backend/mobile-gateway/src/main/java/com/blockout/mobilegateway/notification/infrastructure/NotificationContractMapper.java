package com.blockout.mobilegateway.notification.infrastructure;

import com.blockout.mobilegateway.notification.api.models.RegisterPushTokenRequest;
import com.blockout.mobilegateway.notification.api.models.UnreadCountResponse;
import com.blockout.mobilegateway.notification.application.views.NotificationItemView;
import com.blockout.mobilegateway.notification.application.views.NotificationPageView;
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
     * Converts a generated unread count to the existing public response.
     */
    public UnreadCountResponse toResponse(UnreadCountInternalResponse unreadCount) {
        return unreadCount == null ? null : new UnreadCountResponse(unreadCount.getUnread());
    }

    /**
     * Converts the public push-token request to the generated internal request.
     */
    public RegisterPushTokenInternalRequest toInternalRequest(RegisterPushTokenRequest request) {
        return new RegisterPushTokenInternalRequest(
            request.getExpoPushToken(),
            DevicePlatformEnum.valueOf(request.getPlatform().name()))
            .deviceId(request.getDeviceId());
    }

    private NotificationItemView toView(NotificationInternalResponse notification) {
        return new NotificationItemView(
            notification.getId(),
            notification.getUserId(),
            NotificationType.valueOf(notification.getType().name()),
            notification.getTitle(),
            notification.getBody(),
            notification.getDeepLink(),
            NotificationTargetType.valueOf(notification.getTargetType().name()),
            notification.getTargetId(),
            notification.getMetadata(),
            notification.getIsRead(),
            notification.getIsOpened(),
            notification.getCreatedAt(),
            notification.getReadAt(),
            notification.getOpenedAt());
    }
}
