package com.blockout.notifications.delivery.application;

import com.blockout.shared.model.NotificationTypeEnum;
import java.util.Collection;
import java.util.List;

/** Owns the current reservation and immediate delivery-state transitions. */
public interface DeliveryLedger {

    List<Long> reserve(
            Long matchId,
            Long teamIdA,
            Long teamIdB,
            Long poolId,
            NotificationTypeEnum type);

    int markSent(Long matchId, Collection<Long> userIds);

    int markNoToken(Long matchId, Collection<Long> userIds);

    int markFailed(Long matchId, Collection<Long> userIds, String errorCode, String errorDetail);
}
