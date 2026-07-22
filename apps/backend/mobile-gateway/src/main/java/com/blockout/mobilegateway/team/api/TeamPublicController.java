package com.blockout.mobilegateway.team.api;

import com.blockout.mobilegateway.api.TeamPublicApi;
import com.blockout.mobilegateway.api.models.TeamResponse;
import com.blockout.mobilegateway.api.models.TeamSummaryResponse;
import com.blockout.mobilegateway.team.application.TeamApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Exposes public Team operations through the generated mobile contract. */
@RestController
@RequiredArgsConstructor
public class TeamPublicController implements TeamPublicApi {

    private final TeamApplicationService teamService;
    private final TeamApiMapper mapper;

    @Override
    public ResponseEntity<TeamResponse> getTeamById(Long id) {
        return ResponseEntity.ok(mapper.toResponse(teamService.getTeamById(id)));
    }

    @Override
    public ResponseEntity<List<TeamSummaryResponse>> getTeamsByClubId(String clubId) {
        return ResponseEntity.ok(teamService.getTeamsByClubId(clubId).stream().map(mapper::toResponse).toList());
    }

    @Override
    public ResponseEntity<List<TeamSummaryResponse>> getTeamsByIds(List<Long> ids) {
        return ResponseEntity.ok(teamService.getTeamsByIds(ids).stream().map(mapper::toResponse).toList());
    }
}
