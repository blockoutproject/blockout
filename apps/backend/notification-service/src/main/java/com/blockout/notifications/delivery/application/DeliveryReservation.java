package com.blockout.notifications.delivery.application;

/** Captures the typed follower reservation inputs for one delivery workflow. */
public record DeliveryReservation(
        DeliveryAttemptKey attempt,
        Long teamIdA,
        Long teamIdB,
        Long poolId) {
}
