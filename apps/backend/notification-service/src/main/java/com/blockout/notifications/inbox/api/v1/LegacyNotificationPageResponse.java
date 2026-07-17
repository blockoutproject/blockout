package com.blockout.notifications.inbox.api.v1;

import java.util.List;

/** Carries the retained v1 notification wrapper and continuation fields. */
public record LegacyNotificationPageResponse(
        List<LegacyNotificationResponse> notifications,
        boolean hasNext,
        Integer nextPage) {
}
