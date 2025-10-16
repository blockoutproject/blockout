package com.blockout.search.controllers.v1;

import com.blockout.search.models.docs.ClubSearchDoc;
import com.blockout.search.services.ClubSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/search/clubs")
public class ClubSearchController {

    private final ClubSearchService clubSearchService;

    @Operation(summary = "Search clubs", description = "Recherche des clubs par mots-clés sur plusieurs champs.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Résultats trouvés"),
            @ApiResponse(responseCode = "204", description = "Aucun résultat trouvé")
    })
    @GetMapping
    public ResponseEntity<List<ClubSearchDoc>> search(@RequestParam String query) {
        List<ClubSearchDoc> results = clubSearchService.autocomplete(query);
        return ResponseEntity.ok(results);
    }
}
