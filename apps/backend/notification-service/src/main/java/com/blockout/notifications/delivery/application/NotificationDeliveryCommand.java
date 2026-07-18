package com.blockout.notifications.delivery.application;

import com.blockout.shared.model.NotificationTypeEnum;

/** Carries resolved Blockout content and reservation coordinates into delivery. */
public record NotificationDeliveryCommand(
        Long matchId,
        Long teamIdA,
        Long teamIdB,
        Long poolId,
        NotificationTypeEnum notificationType,
        String title,
        String body,
        Long divisionId) {

    public DeliveryReservation reservation() {
        return new DeliveryReservation(
                new DeliveryAttemptKey(matchId, notificationType), teamIdA, teamIdB, poolId);
    }
}
