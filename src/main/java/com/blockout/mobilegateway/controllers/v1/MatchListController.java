package com.blockout.mobilegateway.controllers.v1;

import com.blockout.mobilegateway.models.dto.match.EnrichedDayPageDTO;
import com.blockout.mobilegateway.services.MatchListService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/match-list")
public class MatchListController {

    private final MatchListService matchListService;

    @Operation(summary = "Get enriched match list", description = "Renvoie une liste de matchs paginée, enrichie avec les équipes et les poules associées.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Match list renvoyée avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucun match trouvé pour les critères fournis")
    })
    @GetMapping
    public ResponseEntity<EnrichedDayPageDTO> getMatchList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam int size,
            @RequestParam(required = false, name = "pool_ids") List<Long> poolIds,
            @RequestParam(required = false, name = "team_ids") List<Long> teamIds,
            @RequestParam String status) {

        EnrichedDayPageDTO matches = matchListService.getMatchList(status, page, size, poolIds, teamIds);
        return ResponseEntity.ok(matches);
    }
}