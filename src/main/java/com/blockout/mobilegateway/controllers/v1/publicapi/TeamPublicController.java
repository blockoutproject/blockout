package com.blockout.mobilegateway.controllers.v1.publicapi;

import com.blockout.mobilegateway.models.dto.team.EnrichedTeamDTO;
import com.blockout.mobilegateway.models.dto.team.TeamSummaryDTO;
import com.blockout.mobilegateway.services.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/public/teams")
public class TeamPublicController {

    private final TeamService teamService;

    @GetMapping("/{id}")
    public ResponseEntity<EnrichedTeamDTO> getEnrichedTeam(@PathVariable("id") Long id) {
        var team = teamService.getTeamById(id);
        return ResponseEntity.ok(team);
    }

    @GetMapping("/by-club/{clubId}")
    public ResponseEntity<List<TeamSummaryDTO>> getTeamsByClubId(@PathVariable("clubId") String clubId) {
        var teams = teamService.getTeamsByClubId(clubId);
        return ResponseEntity.ok(teams);
    }

    @GetMapping("/by-ids")
    public ResponseEntity<List<TeamSummaryDTO>> getTeamsByIds(@RequestParam("ids") List<Long> ids) {
        var teams = teamService.getTeamsByIds(ids);
        return ResponseEntity.ok(teams);
    }
}