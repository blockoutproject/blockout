package com.blockout.mobilegateway.controllers.v1.publicapi;

import com.blockout.mobilegateway.models.dto.search.ClubSearchDocDTO;
import com.blockout.mobilegateway.models.dto.search.PoolSearchDocDTO;
import com.blockout.mobilegateway.models.dto.search.TeamSearchDocDTO;
import com.blockout.mobilegateway.services.clients.SearchClientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/public/search")
public class SearchPublicController {

    private final SearchClientService searchClientService;

    @Operation(summary = "Recherche de clubs", description = "Recherche des clubs via Mobile Gateway.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Résultats trouvés"),
            @ApiResponse(responseCode = "204", description = "Aucun résultat")
    })
    @GetMapping("/clubs")
    public ResponseEntity<List<ClubSearchDocDTO>> searchClubs(@RequestParam String query) {
        List<ClubSearchDocDTO> results = searchClientService.searchClubs(query);
        return results.isEmpty() ? ResponseEntity.noContent().build() : ResponseEntity.ok(results);
    }

    @Operation(summary = "Recherche de poules", description = "Recherche des poules via Mobile Gateway.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Résultats trouvés"),
            @ApiResponse(responseCode = "204", description = "Aucun résultat")
    })
    @GetMapping("/pools")
    public ResponseEntity<List<PoolSearchDocDTO>> searchPools(@RequestParam String query) {
        List<PoolSearchDocDTO> results = searchClientService.searchPools(query);
        return results.isEmpty() ? ResponseEntity.noContent().build() : ResponseEntity.ok(results);
    }

    @Operation(summary = "Recherche d’équipes", description = "Recherche des équipes via Mobile Gateway.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Résultats trouvés"),
            @ApiResponse(responseCode = "204", description = "Aucun résultat")
    })
    @GetMapping("/teams")
    public ResponseEntity<List<TeamSearchDocDTO>> searchTeams(@RequestParam String query) {
        List<TeamSearchDocDTO> results = searchClientService.searchTeams(query);
        return results.isEmpty() ? ResponseEntity.noContent().build() : ResponseEntity.ok(results);
    }
}