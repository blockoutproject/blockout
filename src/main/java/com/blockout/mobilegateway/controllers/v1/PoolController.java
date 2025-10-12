package com.blockout.mobilegateway.controllers.v1;

import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.services.PoolService;
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
@RequestMapping("/api/v1/mobile/pools")
public class PoolController {

    private final PoolService poolService;

    @Operation(
        summary = "List pools by IDs (light)",
        description = "Retourne une liste de poules par leurs IDs avec un payload enrichi (division, saison, leagueName, etc.)."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Liste renvoyée (éventuellement vide)"),
        @ApiResponse(responseCode = "400", description = "Paramètre ids invalide")
    })
    @GetMapping("/by-ids")
    public ResponseEntity<List<EnrichedPoolDTO>> getPoolsByIds(
            @Parameter(description = "Liste d’IDs de poules séparés par des virgules")
            @RequestParam("ids") List<Long> ids) {

        List<EnrichedPoolDTO> pools = poolService.getPoolsByIds(ids);
        return ResponseEntity.ok(pools);
    }
}