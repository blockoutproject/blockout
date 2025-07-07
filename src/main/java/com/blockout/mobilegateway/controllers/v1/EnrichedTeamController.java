package com.blockout.mobilegateway.controllers.v1;

import com.blockout.mobilegateway.models.dto.team.EnrichedTeamDTO;
import com.blockout.mobilegateway.services.EnrichedTeamService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/enriched-team")
public class EnrichedTeamController {

    private final EnrichedTeamService enrichedTeamService;

    @Operation(summary = "Get enriched team by ID", description = "Retourne une équipe enrichie avec division et poules.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Équipe enrichie renvoyée"),
        @ApiResponse(responseCode = "404", description = "Aucune équipe trouvée avec cet ID")
    })
    @GetMapping("/{id}")
    public ResponseEntity<EnrichedTeamDTO> getEnrichedTeam(@PathVariable("id") Long teamId) {
        EnrichedTeamDTO team = enrichedTeamService.getEnrichedTeamById(teamId);
        return ResponseEntity.ok(team);
    }
}