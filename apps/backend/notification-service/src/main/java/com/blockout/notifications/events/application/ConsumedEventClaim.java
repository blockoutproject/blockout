package com.blockout.notifications.events.application;

/** Reports whether this transaction owns an event side effect. */
public enum ConsumedEventClaim {
    CLAIMED,
    DUPLICATE
}
