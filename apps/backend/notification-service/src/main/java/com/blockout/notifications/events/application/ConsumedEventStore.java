package com.blockout.notifications.events.application;

/** Claims the event marker inside the same local transaction as its side effect. */
public interface ConsumedEventStore {

    ConsumedEventClaim claim(ConsumedEventIdentity identity);
}
