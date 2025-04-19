package com.blockout.pools.controllers.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.blockout.pools.models.Pool;
import com.blockout.pools.services.PoolService;

import java.net.URI;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/pools")
public class PoolController {

    private final PoolService poolService;

    public PoolController(PoolService poolService) {
        this.poolService = poolService;
    }

    @Operation(summary = "Créer une pool", description = "Crée une nouvelle pool avec les informations fournies.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Pool créée avec succès"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PostMapping("/")
    public ResponseEntity<Pool> createPool(@RequestBody Pool pool) {
        Pool createdPool = poolService.createPool(pool);
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(createdPool.getId())
                .toUri();
        return ResponseEntity.created(location).body(createdPool);
    }

    @Operation(summary = "Récupérer toutes les pools", description = "Retourne une liste de toutes les pools disponibles.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des pools renvoyée avec succès")
    })
    @GetMapping("/")
    public ResponseEntity<List<Pool>> getAllPools() {
        List<Pool> pools = poolService.getAllPools();
        return ResponseEntity.ok(pools);
    }

    @Operation(summary = "Récupérer les pools par ligue et saison", description = "Retourne une liste des pools pour un code de ligue et une saison donnés.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des pools renvoyée avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucune pool trouvée pour ce league_code et saison")
    })
    @GetMapping("/league/{league_code}/season/{season}")
    public ResponseEntity<List<Pool>> getPoolsByLeagueAndSeason(
            @Parameter(description = "Code de la ligue") @PathVariable String league_code,
            @Parameter(description = "Saison de la pool") @PathVariable Integer season) {

        List<Pool> pools = poolService.getPoolsByLeagueAndSeason(league_code, season);

        if (pools.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(pools);
    }

    @Operation(summary = "Récupérer une pool par code, ligue et saison", description = "Retourne une pool spécifique en fonction du code de la pool, du code de la ligue et de la saison.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Pool trouvée avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucune pool trouvée")
    })
    @GetMapping("/{pool_code}/{league_code}/{season}")
    public ResponseEntity<Pool> getPoolByCodeLeagueSeason(
            @Parameter(description = "Code de la pool") @PathVariable String pool_code,
            @Parameter(description = "Code de la ligue") @PathVariable String league_code,
            @Parameter(description = "Saison de la pool") @PathVariable Integer season) {

        Optional<Pool> pool = poolService.getPoolByCodeAndLeagueAndSeason(pool_code, league_code, season);
        return pool.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @Operation(summary = "Récupérer une pool par ID", description = "Retourne une pool spécifique en fonction de l'ID fourni.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Pool trouvée"),
            @ApiResponse(responseCode = "404", description = "Pool non trouvée")
    })
    @GetMapping("/{id}")
    public ResponseEntity<Optional<Pool>> getPoolById(
            @Parameter(description = "ID de la pool à récupérer") @PathVariable Long id) {
        Optional<Pool> pool = poolService.getPoolById(id);
        return pool.isPresent() ? ResponseEntity.ok(pool)
                : ResponseEntity.notFound().build();
    }

    @Operation(summary = "Mettre à jour une pool", description = "Met à jour une pool avec les informations fournies.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Pool mise à jour avec succès"),
            @ApiResponse(responseCode = "404", description = "Pool non trouvée")
    })
    @PutMapping("/{id}")
    public ResponseEntity<Pool> updatePool(
            @Parameter(description = "ID de la pool à mettre à jour") @PathVariable Long id,
            @RequestBody Pool updatedPool) {
        try {
            Pool updated = poolService.updatePool(id, updatedPool);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Récupérer les pools actives par league_code", description = "Retourne une liste des pools actives pour un code de ligue donné.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des pools actives renvoyée avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucune pool active trouvée pour ce league_code")
    })
    @GetMapping("/active")
    public ResponseEntity<List<Pool>> getActivePoolsByLeagueCode(
            @RequestParam String league_code) {

        List<Pool> activePools = poolService.getActivePoolsByLeagueCode(league_code);

        if (activePools.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(activePools);
    }
}