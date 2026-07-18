package com.blockout.pools.pool.event.outbox;

import com.blockout.events.v2.model.PoolUpsertV2Event;
import com.blockout.pools.models.events.PoolUpsertEvent;

record PoolEventMessages(PoolUpsertEvent legacy, PoolUpsertV2Event canonical) {
}
