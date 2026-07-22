package com.blockout.mobilegateway.notification.application.views;

import java.util.List;

/**
 * Transport-independent notification page used by the gateway application layer.
 */
public record NotificationPageView(
    List<NotificationItemView> notifications,
    boolean hasNext,
    Integer nextPage) {
}
