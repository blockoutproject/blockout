package com.blockout.notifications.notification.application.views;

import java.util.List;

public record NotificationPageView(List<NotificationView> notifications, boolean hasNext, Integer nextPage) {
}
