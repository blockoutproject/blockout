package com.blockout.config.controllers.v1;

import com.blockout.config.models.Division;
import com.blockout.config.models.dto.DivisionUpdateDTO;
import com.blockout.config.services.DivisionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/config/divisions")
public class DivisionController {

    private final DivisionService divisionService;

    @Operation(summary = "Créer une division", description = "Crée une nouvelle division.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Division créée ou réactivée"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PostMapping
    public ResponseEntity<Division> create(@RequestBody Division division) {
        Division saved = divisionService.createDivision(division);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(saved.getId())
            .toUri();
        return ResponseEntity.created(location).body(saved);
    }

    @Operation(summary = "Liste toutes les divisions", description = "Renvoie la liste complète des divisions actives et inactives.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Liste des divisions renvoyée")
    })
    @GetMapping
    public ResponseEntity<List<Division>> listAll() {
        List<Division> divisions = divisionService.findAll();
        return ResponseEntity.ok(divisions);
    }

    @Operation(summary = "Récupère une division par ID", description = "Renvoie une division à partir de son identifiant.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Division trouvée"),
            @ApiResponse(responseCode = "404", description = "Division introuvable")
    })
    @GetMapping("/{id}")
    public ResponseEntity<Division> getById(@PathVariable Long id) {
        return divisionService.getById(id)
                .map(ResponseEntity::ok)
                .orElseThrow(); // laisser gérer par handler global si vide
    }

    @Operation(summary = "Met à jour une division", description = "Met à jour les informations d'une division existante.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Division mise à jour"),
            @ApiResponse(responseCode = "404", description = "Division introuvable")
    })
    @PutMapping("/{id}")
    public ResponseEntity<Division> update(
            @PathVariable Long id,
            @RequestBody DivisionUpdateDTO dto
    ) {
        Division updated = divisionService.updateDivision(id, dto);
        return ResponseEntity.ok(updated);
    }

    @Operation(summary = "Désactive une division", description = "Désactive une division (soft delete).")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Division désactivée"),
            @ApiResponse(responseCode = "404", description = "Division introuvable")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        divisionService.deactivateDivision(id);
        return ResponseEntity.noContent().build();
    }
}