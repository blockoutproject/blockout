package com.blockout.pools.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.blockout.pools.models.Pool;
import com.blockout.pools.services.PoolService;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/pools")
public class PoolController {

    @Autowired
    private PoolService poolService;

    @Operation(summary = "Créer une pool", description = "Crée une nouvelle pool avec les informations fournies.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Pool créée avec succès"),
        @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PostMapping
    public ResponseEntity<Pool> createPool(@RequestBody Pool pool) {
        Pool createdPool = poolService.createPool(pool);
        return new ResponseEntity<>(createdPool, HttpStatus.CREATED);
    }

    @Operation(summary = "Récupérer toutes les pools", description = "Retourne une liste de toutes les pools disponibles.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Liste des pools renvoyée avec succès")
    })
    @GetMapping
    public ResponseEntity<List<Pool>> getAllPools() {
        List<Pool> pools = poolService.getAllPools();
        return new ResponseEntity<>(pools, HttpStatus.OK);
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
        return pool.isPresent() ? new ResponseEntity<>(pool, HttpStatus.OK) : new ResponseEntity<>(HttpStatus.NOT_FOUND);
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
            return new ResponseEntity<>(updated, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @Operation(summary = "Supprimer une pool", description = "Supprime une pool en fonction de l'ID fourni.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Pool supprimée avec succès"),
        @ApiResponse(responseCode = "404", description = "Pool non trouvée")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePool(
        @Parameter(description = "ID de la pool à supprimer") @PathVariable Long id) {
        poolService.deletePool(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}