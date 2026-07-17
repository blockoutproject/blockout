package com.blockout.workersearch.pool.outbound;

import com.blockout.workersearch.models.enums.Format;
import com.blockout.workersearch.models.enums.Gender;
import com.blockout.workersearch.models.events.PoolUpsertEvent;
import com.blockout.workersearch.pool.application.PoolSnapshot;
import org.springframework.stereotype.Component;

@Component
public class PoolSnapshotEventProjector {

    public PoolUpsertEvent project(PoolSnapshot pool) {
        return PoolUpsertEvent.builder()
                .id(pool.id())
                .name(pool.name())
                .shortName(pool.shortName())
                .divisionId(pool.divisionId())
                .leagueCode(pool.leagueCode())
                .leagueName(pool.leagueName())
                .season(pool.season())
                .format(pool.format() == null ? null : Format.valueOf(pool.format().name()))
                .gender(pool.gender() == null ? null : Gender.valueOf(pool.gender().name()))
                .build();
    }
}
