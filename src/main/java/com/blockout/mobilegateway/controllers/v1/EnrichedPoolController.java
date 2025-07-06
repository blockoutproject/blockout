package com.blockout.mobilegateway.controllers.v1;

import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.services.EnrichedPoolService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/enriched-pool")
public class EnrichedPoolController {

    private final EnrichedPoolService enrichedPoolService;

    @Operation(summary = "Get enriched pool by ID", description = "Retourne une poule enrichie avec sa division.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Poule enrichie renvoyée"),
        @ApiResponse(responseCode = "404", description = "Aucune poule trouvée avec cet ID")
    })
    @GetMapping("/{id}")
    public ResponseEntity<EnrichedPoolDTO> getEnrichedPool(@PathVariable("id") Long poolId) {
        EnrichedPoolDTO pool = enrichedPoolService.getEnrichedPoolById(poolId);
        if (pool == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(pool);
    }
}