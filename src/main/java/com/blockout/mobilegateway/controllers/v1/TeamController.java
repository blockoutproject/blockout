package com.blockout.mobilegateway.controllers.v1;

import com.blockout.mobilegateway.models.dto.team.TeamSummaryDTO;
import com.blockout.mobilegateway.services.TeamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/teams")
public class TeamController {

    private final TeamService teamService;

    @Operation(
        summary = "List teams by Club ID (light)",
        description = "Retourne les équipes d’un club avec un payload minimal (name, division, season, gender, club[logo])."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Liste renvoyée (éventuellement vide)"),
        @ApiResponse(responseCode = "400", description = "Paramètre clubId invalide")
    })
    @GetMapping("/by-club/{clubId}")
    public ResponseEntity<List<TeamSummaryDTO>> getTeamsByClubId(
            @Parameter(description = "Identifiant du club (String)") @PathVariable("clubId") String clubId) {
        List<TeamSummaryDTO> teams = teamService.getTeamsByClubId(clubId);
        return ResponseEntity.ok(teams);
    }
}