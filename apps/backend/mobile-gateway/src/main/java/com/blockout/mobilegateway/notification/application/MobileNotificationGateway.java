package com.blockout.mobilegateway.notification.application;

public interface MobileNotificationGateway {

    MobileNotificationWorkflow.PageView list(int page, int pageSize);

    long unreadCount();

    void markRead(Long id);

    void markOpened(Long id);

    void delete(Long id);

    void register(Long userId, MobileNotificationWorkflow.PushTokenCommand command);
}
