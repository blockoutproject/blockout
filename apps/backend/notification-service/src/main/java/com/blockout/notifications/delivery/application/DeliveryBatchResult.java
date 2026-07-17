package com.blockout.notifications.delivery.application;

import java.util.List;
import java.util.Set;

/** Aggregates immediate provider ticket outcomes without exposing provider models. */
public record DeliveryBatchResult(
        Set<Long> successfulUserIds,
        Set<Long> failedUserIds,
        List<String> invalidTokens) {

    public DeliveryBatchResult {
        successfulUserIds = successfulUserIds == null ? Set.of() : Set.copyOf(successfulUserIds);
        failedUserIds = failedUserIds == null ? Set.of() : Set.copyOf(failedUserIds);
        invalidTokens = invalidTokens == null ? List.of() : List.copyOf(invalidTokens);
    }
}
