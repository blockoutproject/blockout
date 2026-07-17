package com.blockout.workersearch.team.outbound;

import com.blockout.shared.model.PageInfo;
import com.blockout.workersearch.team.application.TeamCatalog;
import com.blockout.workersearch.team.application.TeamSnapshot;
import com.blockout.workersearch.teamsclient.api.TeamsClient;
import com.blockout.workersearch.teamsclient.model.TeamInternalPageResponse;
import java.util.ArrayList;
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
        List<TeamSnapshot> teams = new ArrayList<>();
        int page = 0;
        boolean hasNext;
        do {
            TeamInternalPageResponse response = client.listTeams(
                    null, null, null, null, clubId, null, active, page, PAGE_SIZE);
            if (response == null) {
                return List.copyOf(teams);
            }
            if (response.getItems() != null) {
                response.getItems().stream().map(mapper::toSnapshot).forEach(teams::add);
            }
            PageInfo pageInfo = response.getPageInfo();
            hasNext = pageInfo != null && Boolean.TRUE.equals(pageInfo.getHasNext());
            page++;
        } while (hasNext);
        return List.copyOf(teams);
    }
}
