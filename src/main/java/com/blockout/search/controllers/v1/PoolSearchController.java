package com.blockout.search.controllers.v1;

import com.blockout.search.models.dto.PoolSearchDocDTO;
import com.blockout.search.services.PoolSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/search/pools")
public class PoolSearchController {

    private final PoolSearchService poolSearchService;

    @Operation(summary = "Search pools", description = "Recherche des poules par mots-clés sur plusieurs champs, avec filtre saison optionnel.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Résultats trouvés"),
            @ApiResponse(responseCode = "204", description = "Aucun résultat trouvé")
    })
    @GetMapping
    public ResponseEntity<List<PoolSearchDocDTO>> search(
            @RequestParam String query,
            @RequestParam(required = false) String season
    ) {
        List<PoolSearchDocDTO> results = poolSearchService.autocomplete(query, season);
        return ResponseEntity.ok(results);
    }
}