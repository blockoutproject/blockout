package com.blockout.config.controllers.v1;

import com.blockout.config.models.RawDivisionMapping;
import com.blockout.config.models.dto.RawDivisionMappingUpdateDTO;
import com.blockout.config.services.RawDivisionMappingService;
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
@RequestMapping("/api/v1/config/raw-divisions")
public class RawDivisionMappingController {

    private final RawDivisionMappingService service;

    @Operation(summary = "Créer un RawDivisionMapping")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Créé avec succès"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PreAuthorize("hasAuthority('SCOPE_create:raw_division_mapping')")
    @PostMapping
    public ResponseEntity<RawDivisionMapping> create(@RequestBody RawDivisionMapping rawPoolMapping) {
        RawDivisionMapping created = service.create(rawPoolMapping);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @Operation(summary = "Lister les RawDivisionMappings", description = "Filtres possibles : leagueCode, season")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Liste renvoyée")
    })
    @PreAuthorize("hasAuthority('SCOPE_read:raw_division_mapping')")
    @GetMapping
    public ResponseEntity<List<RawDivisionMapping>> list(
            @RequestParam(required = false, name = "league_code") String leagueCode,
            @RequestParam(required = false) Integer season) {
        List<RawDivisionMapping> mappings = service.findByLeagueCodeAndSeason(leagueCode, season);
        return ResponseEntity.ok(mappings);
    }

    @Operation(summary = "Récupérer un RawDivisionMapping par ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Ressource trouvée"),
            @ApiResponse(responseCode = "404", description = "Introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_read:raw_division_mapping')")
    @GetMapping("/{id}")
    public ResponseEntity<RawDivisionMapping> getById(@PathVariable Long id) {
        RawDivisionMapping result = service.getById(id);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Mettre à jour un RawDivisionMapping")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Mise à jour réussie"),
            @ApiResponse(responseCode = "404", description = "Introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_update:raw_division_mapping')")
    @PutMapping("/{id}")
    public ResponseEntity<RawDivisionMapping> update(
            @PathVariable Long id,
            @RequestBody RawDivisionMappingUpdateDTO dto
    ) {
        RawDivisionMapping updated = service.update(id, dto);
        return ResponseEntity.ok(updated);
    }
}