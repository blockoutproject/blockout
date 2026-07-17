package com.blockout.mobilegateway.notification.outbound;

import com.blockout.mobilegateway.notification.application.MobileNotificationGateway;
import com.blockout.mobilegateway.notification.application.MobileNotificationWorkflow;
import com.blockout.mobilegateway.notificationclient.api.NotificationInboxMutationsClient;
import com.blockout.mobilegateway.notificationclient.api.NotificationInboxPagesClient;
import com.blockout.mobilegateway.notificationclient.api.NotificationPushTokensClient;
import com.blockout.mobilegateway.notificationclient.model.RegisterPushTokenInternalRequest;
import org.springframework.stereotype.Component;

@Component
public class GeneratedMobileNotificationGateway implements MobileNotificationGateway {

    private final NotificationInboxPagesClient pages;
    private final NotificationInboxMutationsClient mutations;
    private final NotificationPushTokensClient tokens;

    public GeneratedMobileNotificationGateway(
            NotificationInboxPagesClient pages,
            NotificationInboxMutationsClient mutations,
            NotificationPushTokensClient tokens) {
        this.pages = pages;
        this.mutations = mutations;
        this.tokens = tokens;
    }

    @Override
    public MobileNotificationWorkflow.PageView list(int page, int pageSize) {
        var response = pages.listCurrentUserNotifications(page, pageSize);
        var pageInfo = response.getPageInfo();
        var items = response.getItems().stream()
                .map(item -> new MobileNotificationWorkflow.ItemView(
                        item.getId(), item.getType(), item.getTitle(), item.getBody(), item.getDeepLink(),
                        item.getDivisionId(), Boolean.TRUE.equals(item.getIsRead()), Boolean.TRUE.equals(item.getIsOpened()),
                        item.getCreatedAt(), null))
                .toList();
        return new MobileNotificationWorkflow.PageView(
                items, pageInfo.getPage(), pageInfo.getPageSize(), pageInfo.getTotalItems(), pageInfo.getHasNext());
    }

    @Override
    public long unreadCount() {
        return mutations.getCurrentUserUnreadNotificationCount().getUnreadCount();
    }

    @Override
    public void markRead(Long id) {
        mutations.markCurrentUserNotificationRead(id);
    }

    @Override
    public void markOpened(Long id) {
        mutations.markCurrentUserNotificationOpened(id);
    }

    @Override
    public void delete(Long id) {
        mutations.deleteCurrentUserNotification(id);
    }

    @Override
    public void register(Long userId, MobileNotificationWorkflow.PushTokenCommand command) {
        var request = new RegisterPushTokenInternalRequest()
                .expoPushToken(command.expoPushToken())
                .platform(command.platform())
                .deviceId(command.deviceId());
        tokens.registerUserPushToken(userId, request);
    }
}
