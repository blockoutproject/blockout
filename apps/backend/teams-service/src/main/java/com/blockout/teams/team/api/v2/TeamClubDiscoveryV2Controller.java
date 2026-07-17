package com.blockout.teams.team.api.v2;

import com.blockout.shared.model.PageInfo;
import com.blockout.teams.generated.api.TeamClubDiscoveryApi;
import com.blockout.teams.generated.model.TeamClubIdPageResponse;
import com.blockout.teams.team.application.TeamClubIdPage;
import com.blockout.teams.team.application.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class TeamClubDiscoveryV2Controller implements TeamClubDiscoveryApi {

    private final TeamService service;

    @Override
    public ResponseEntity<TeamClubIdPageResponse> listTeamClubIds(Integer page, Integer pageSize) {
        TeamClubIdPage result = service.findClubIdsPage(page, pageSize);
        PageInfo pageInfo = new PageInfo(result.page(), result.pageSize(), result.hasNext())
                .totalItems(result.totalItems());
        return ResponseEntity.ok(new TeamClubIdPageResponse(result.items(), pageInfo));
    }
}
