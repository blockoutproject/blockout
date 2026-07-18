package com.blockout.notifications.delivery.application;

import com.blockout.shared.model.NotificationTypeEnum;

/** Identifies one notification-type delivery attempt for a match. */
public record DeliveryAttemptKey(Long matchId, NotificationTypeEnum notificationType) {
}
