package com.blockout.search.controllers.v1;

import com.blockout.search.models.dto.TeamSearchDocDTO;
import com.blockout.search.services.TeamSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/search/teams")
public class TeamSearchController {

    private final TeamSearchService teamSearchService;

    @Operation(summary = "Search teams", description = "Recherche des équipes par mots-clés sur plusieurs champs.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Résultats trouvés"),
            @ApiResponse(responseCode = "204", description = "Aucun résultat trouvé")
    })
    @GetMapping
    public ResponseEntity<List<TeamSearchDocDTO>> search(@RequestParam String query) {
        List<TeamSearchDocDTO> results = teamSearchService.autocomplete(query);
        return ResponseEntity.ok(results);
    }
}
