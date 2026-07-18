package com.blockout.workersearch.team.outbound;

import com.blockout.workersearch.shared.outbound.GeneratedClientPageCollector;
import com.blockout.workersearch.team.application.TeamCatalog;
import com.blockout.workersearch.team.application.TeamSnapshot;
import com.blockout.workersearch.teamsclient.api.TeamsClient;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TeamsServiceCatalog implements TeamCatalog {

    private static final int PAGE_SIZE = 100;

    private final TeamsClient client;
    private final TeamSnapshotMapper mapper;

    @Override
    public List<TeamSnapshot> findActiveTeams() {
        return findAll(null, true);
    }

    @Override
    public List<TeamSnapshot> findByClubId(String clubId) {
        return findAll(clubId, null);
    }

    private List<TeamSnapshot> findAll(String clubId, Boolean active) {
        return GeneratedClientPageCollector.collect(
                page -> client.listTeams(null, null, null, null, clubId, null, active, page, PAGE_SIZE),
                response -> response.getItems(),
                response -> response.getPageInfo(),
                mapper::toSnapshot);
    }
}
