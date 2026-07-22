package com.blockout.notifications.notification.application.views;

import java.util.List;

/**
 * Represents one page of user notifications.
 */
public record NotificationPageView(List<NotificationView> notifications, boolean hasNext, Integer nextPage) {
}
