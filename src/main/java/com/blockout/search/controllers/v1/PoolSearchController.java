package com.blockout.search.controllers.v1;

import com.blockout.search.models.docs.PoolSearchDoc;
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

    @Operation(summary = "Search pools", description = "Recherche des poules par mots-clés sur plusieurs champs.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Résultats trouvés"),
            @ApiResponse(responseCode = "204", description = "Aucun résultat trouvé")
    })
    @GetMapping
    public ResponseEntity<List<PoolSearchDoc>> search(@RequestParam String query) {
        List<PoolSearchDoc> results = poolSearchService.autocomplete(query);
        return ResponseEntity.ok(results);
    }
}