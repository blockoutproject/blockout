package com.blockout.competitions.lifecycle.event.outbox;

record CompetitionLifecycleEventMessages(
        String eventType,
        String orderingKey,
        String v1Route,
        Object legacy,
        String v2Route,
        Object canonical) {
}
