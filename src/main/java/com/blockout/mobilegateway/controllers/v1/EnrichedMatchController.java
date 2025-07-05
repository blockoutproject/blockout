package com.blockout.mobilegateway.controllers.v1;

import com.blockout.mobilegateway.models.dto.match.EnrichedMatchDTO;
import com.blockout.mobilegateway.services.EnrichedMatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/enriched-match")
public class EnrichedMatchController {

    private final EnrichedMatchService enrichedMatchService;

    @Operation(summary = "Get enriched match by ID", description = "Retourne un match enrichi avec équipes, pool et division.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Match enrichi renvoyé"),
        @ApiResponse(responseCode = "404", description = "Aucun match trouvé avec cet ID")
    })
    @GetMapping("/{id}")
    public ResponseEntity<EnrichedMatchDTO> getEnrichedMatch(@PathVariable("id") Long matchId) {
        EnrichedMatchDTO match = enrichedMatchService.getEnrichedMatchById(matchId);
        if (match == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(match);
    }
}