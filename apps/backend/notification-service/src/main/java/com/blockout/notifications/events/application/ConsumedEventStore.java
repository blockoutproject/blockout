package com.blockout.notifications.events.application;

import com.blockout.shared.model.ConsumedEventClaimEnum;
/** Claims the event marker inside the same local transaction as its side effect. */
public interface ConsumedEventStore {

    ConsumedEventClaimEnum claim(ConsumedEventIdentity identity);
}
