package com.blockout.notifications.notification.api.models;

import java.util.List;

public record NotificationPageInternalResponse(
    List<NotificationInternalResponse> notifications,
    boolean hasNext,
    Integer nextPage) {
}
