package com.blockout.workersearch.team.outbound;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
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
                .format(FormatEnum.valueOf(team.format().name()))
                .gender(GenderEnum.valueOf(team.gender().name()))
                .season(team.season())
                .logoUrl(team.logoUrl())
                .build();
    }
}
