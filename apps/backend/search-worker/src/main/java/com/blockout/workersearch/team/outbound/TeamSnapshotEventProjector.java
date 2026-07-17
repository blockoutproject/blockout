package com.blockout.workersearch.team.outbound;

import com.blockout.workersearch.models.enums.Format;
import com.blockout.workersearch.models.enums.Gender;
import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.blockout.workersearch.team.application.TeamSnapshot;
import org.springframework.stereotype.Component;

@Component
public class TeamSnapshotEventProjector {

    public TeamUpsertEvent project(TeamSnapshot team) {
        return TeamUpsertEvent.builder()
                .id(team.id())
                .name(team.name())
                .shortName(team.shortName())
                .clubId(team.clubId())
                .divisionId(team.divisionId())
                .format(Format.valueOf(team.format().name()))
                .gender(Gender.valueOf(team.gender().name()))
                .season(team.season())
                .logoUrl(team.logoUrl())
                .build();
    }
}
