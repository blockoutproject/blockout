package com.blockout.matches.controllers.v1;

import com.blockout.matches.models.Match;
import com.blockout.matches.models.dto.BulkMatchesDeactivateRequestDTO;
import com.blockout.matches.models.dto.DayPageDTO;
import com.blockout.matches.models.enums.MatchStatus;
import com.blockout.matches.services.MatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.Collections;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/matches")
public class MatchController {

    private final MatchService matchService;

    @Operation(summary = "Lister les matchs", description = "Retourne les matchs avec filtres optionnels : poolId, teamIds, status, active.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Liste des matchs")
    })
    @GetMapping
    public ResponseEntity<List<Match>> listMatches(
            @RequestParam(required = false, name = "pool_id") Long poolId,
            @RequestParam(required = false, name = "team_ids") List<Long> teamIds,
            @RequestParam(required = false) MatchStatus status,
            @RequestParam(required = false) Boolean active) {
        List<Match> matches = matchService.findMatches(poolId, teamIds, status, active);
        return ResponseEntity.ok(matches);
    }

    @Operation(summary = "Récupérer un match par ID", description = "Renvoie un match par son identifiant.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Match trouvé"),
            @ApiResponse(responseCode = "404", description = "Match introuvable")
    })
    @GetMapping("/{id}")
    public ResponseEntity<Match> getMatchById(@PathVariable Long id) {
        Match match = matchService.getMatchById(id);
        return ResponseEntity.ok(match);
    }

    @Operation(summary = "Créer un match", description = "Crée un nouveau match.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Match créé"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PreAuthorize("hasAuthority('SCOPE_create:matches')")
    @PostMapping
    public ResponseEntity<Match> createMatch(@RequestBody Match match) {
        Match created = matchService.createMatch(match);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @Operation(summary = "Mettre à jour un match", description = "Met à jour un match existant.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Match mis à jour"),
            @ApiResponse(responseCode = "404", description = "Match introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_update:matches')")
    @PutMapping("/{id}")
    public ResponseEntity<Match> updateMatch(
            @PathVariable Long id,
            @RequestBody Match updated) {
        Match result = matchService.updateMatch(id, updated);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Groupes de matchs par jour", description = "Retourne les groupes de matchs par jour avec pagination.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Groupes de jours retournés")
    })
    @GetMapping("/day-groups")
    public ResponseEntity<DayPageDTO> dayGroups(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "4") int size,
            @RequestParam(required = false, name = "pool_ids") List<Long> poolIds,
            @RequestParam(required = false, name = "team_ids") List<Long> teamIds,
            @RequestParam(required = false) MatchStatus status) {
        DayPageDTO dto = matchService.getMatchesByDay(
                poolIds == null ? Collections.emptyList() : poolIds,
                teamIds == null ? Collections.emptyList() : teamIds,
                status,
                page,
                size);
        return ResponseEntity.ok(dto);
    }

    @Operation(summary = "Désactiver des matchs par pool", description = "Désactive les matchs d'une pool via leurs matchCodes.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Matches désactivés")
    })
    @PreAuthorize("hasAuthority('SCOPE_delete:matches')")
    @PutMapping("/pools/{poolId}/bulk-deactivate")
    public ResponseEntity<Void> bulkDeactivateMatches(
            @PathVariable Long poolId,
            @RequestBody BulkMatchesDeactivateRequestDTO request) {
        matchService.bulkDeactivateMatches(poolId, request.getMissingMatchCodes());
        return ResponseEntity.ok().build();
    }
}