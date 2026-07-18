package com.blockout.notifications.delivery.application;

import java.util.Collection;
import java.util.List;

/** Owns the current reservation and immediate delivery-state transitions. */
public interface DeliveryLedger {

    List<Long> reserve(DeliveryReservation reservation);

    int markSent(DeliveryAttemptKey attempt, Collection<Long> userIds);

    int markNoToken(DeliveryAttemptKey attempt, Collection<Long> userIds);

    int markFailed(
            DeliveryAttemptKey attempt,
            Collection<Long> userIds,
            String errorCode,
            String errorDetail);
}
