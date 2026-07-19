package com.blockout.mobilegateway.team.api;

import com.blockout.mobilegateway.team.api.models.TeamResponse;
import com.blockout.mobilegateway.team.api.models.TeamSummaryResponse;
import com.blockout.mobilegateway.team.application.TeamApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/public/teams")
public class TeamPublicController {

    private final TeamApplicationService teamService;

    @GetMapping("/{id}")
    public ResponseEntity<TeamResponse> getEnrichedTeam(@PathVariable("id") Long id) {
        var team = teamService.getTeamById(id);
        return ResponseEntity.ok(team);
    }

    @GetMapping("/by-club/{clubId}")
    public ResponseEntity<List<TeamSummaryResponse>> getTeamsByClubId(@PathVariable("clubId") String clubId) {
        var teams = teamService.getTeamsByClubId(clubId);
        return ResponseEntity.ok(teams);
    }

    @GetMapping("/by-ids")
    public ResponseEntity<List<TeamSummaryResponse>> getTeamsByIds(@RequestParam("ids") List<Long> ids) {
        var teams = teamService.getTeamsByIds(ids);
        return ResponseEntity.ok(teams);
    }
}