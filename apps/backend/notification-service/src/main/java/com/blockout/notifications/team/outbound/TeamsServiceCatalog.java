package com.blockout.notifications.team.outbound;

import com.blockout.notifications.team.application.TeamCatalog;
import com.blockout.notifications.team.application.TeamNameSnapshot;
import com.blockout.notifications.teamsclient.api.TeamsClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TeamsServiceCatalog implements TeamCatalog {

    private final TeamsClient client;
    private final TeamNameSnapshotMapper mapper;

    @Override
    public TeamNameSnapshot getById(Long id) {
        var response = client.getTeam(id);
        return response == null ? null : mapper.toSnapshot(response);
    }
}
