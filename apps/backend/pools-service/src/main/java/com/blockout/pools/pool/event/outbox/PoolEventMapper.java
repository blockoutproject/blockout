package com.blockout.pools.pool.event.outbox;

import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.PoolUpsertV2Event;
import com.blockout.events.v2.model.PoolUpsertV2Payload;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.pools.models.events.PoolUpsertEvent;
import com.blockout.pools.pool.application.PoolUpsertFact;
import org.springframework.stereotype.Component;

@Component
class PoolEventMapper {

    PoolEventMessages map(PoolUpsertFact pool, OutboxMetadata metadata) {
        var legacy = PoolUpsertEvent.builder()
                .id(pool.id())
                .name(pool.name())
                .shortName(pool.shortName())
                .divisionId(pool.divisionId())
                .leagueCode(pool.leagueCode())
                .leagueName(pool.leagueName())
                .season(pool.season())
                .format(pool.format() == null ? null : FormatEnum.valueOf(pool.format().name()))
                .gender(pool.gender() == null ? null : GenderEnum.valueOf(pool.gender().name()))
                .build();
        var canonical = new PoolUpsertV2Event(
                null,
                metadata.correlationId(),
                metadata.eventId(),
                EventType.POOL_UPSERT,
                metadata.occurredAt(),
                "pool:" + pool.id(),
                new PoolUpsertV2Payload(
                        pool.divisionId(), value(pool.format()), value(pool.gender()), pool.id(), pool.leagueCode(),
                        pool.leagueName(), pool.name(), pool.season(), pool.shortName()),
                OutboxPoolEventPublisher.PRODUCER,
                OutboxPoolEventPublisher.VERSION);
        return new PoolEventMessages(legacy, canonical);
    }

    private String value(Object value) {
        return value == null ? null : value.toString();
    }
}
