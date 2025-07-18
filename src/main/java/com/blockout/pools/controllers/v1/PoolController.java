package com.blockout.pools.controllers.v1;

import com.blockout.pools.models.Pool;
import com.blockout.pools.services.PoolService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pools")
public class PoolController {

    private final PoolService poolService;

    @Operation(summary = "Lister les pools", description = "Renvoie toutes les pools. Filtres possibles : leagueCode, season, active, ids.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Liste des pools")
    })
    @GetMapping
    public ResponseEntity<List<Pool>> listPools(
            @RequestParam(required = false, name = "league_code") String leagueCode,
            @RequestParam(required = false) Integer season,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) List<Long> ids) {
        List<Pool> pools = poolService.findPools(leagueCode, season, active, ids);
        return ResponseEntity.ok(pools);
    }

    @Operation(summary = "Récupérer une pool par ID", description = "Renvoie une pool par son identifiant.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Pool trouvée"),
            @ApiResponse(responseCode = "404", description = "Pool introuvable")
    })
    @GetMapping("/{id}")
    public ResponseEntity<Pool> getPoolById(@PathVariable Long id) {
        Pool pool = poolService.getPoolById(id);
        return ResponseEntity.ok(pool);
    }

    @Operation(summary = "Créer une pool", description = "Crée une nouvelle pool.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Pool créée"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PreAuthorize("hasAuthority('SCOPE_create:pools')")
    @PostMapping
    public ResponseEntity<Pool> createPool(@RequestBody Pool pool) {
        Pool created = poolService.createPool(pool);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @Operation(summary = "Mettre à jour une pool", description = "Met à jour une pool existante.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Pool mise à jour"),
            @ApiResponse(responseCode = "404", description = "Pool introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_update:pools')")
    @PutMapping("/{id}")
    public ResponseEntity<Pool> updatePool(
            @PathVariable Long id,
            @RequestBody Pool updatedPool) {
        Pool result = poolService.updatePool(id, updatedPool);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Désactiver une pool", description = "Désactive (soft delete) une pool.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Pool désactivée"),
            @ApiResponse(responseCode = "404", description = "Pool introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_delete:pools')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivatePool(@PathVariable Long id) {
        poolService.deactivatePool(id);
        return ResponseEntity.noContent().build();
    }
}