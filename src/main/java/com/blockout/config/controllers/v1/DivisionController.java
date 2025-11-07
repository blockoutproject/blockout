package com.blockout.config.controllers.v1;

import com.blockout.config.models.dto.DivisionUpdateDTO;
import com.blockout.config.models.entity.Division;
import com.blockout.config.services.DivisionService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/config/divisions")
public class DivisionController {

    private final DivisionService divisionService;
    private final ObjectMapper objectMapper;

    @Operation(summary = "Liste toutes les divisions", description = "Renvoie la liste complète des divisions actives et inactives.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Liste des divisions renvoyée")
    })
    @PreAuthorize("hasAuthority('SCOPE_read:divisions')")
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
    @PreAuthorize("hasAuthority('SCOPE_read:divisions')")
    @GetMapping("/{id}")
    public ResponseEntity<Division> getDivisionById(@PathVariable Long id) {
        Division division = divisionService.getDivisionById(id);
        return ResponseEntity.ok(division);
    }

    @Operation(summary = "Créer une division", description = "Crée une nouvelle division.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Division créée ou réactivée"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PreAuthorize("hasAuthority('SCOPE_create:divisions')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Division> createDivision(
            @RequestPart("data") String json,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {

        DivisionUpdateDTO dto = objectMapper.readValue(json, DivisionUpdateDTO.class);
        Division saved = divisionService.createDivision(dto, image);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(saved.getId())
                .toUri();

        return ResponseEntity.created(location).body(saved);
    }

    @Operation(summary = "Met à jour une division", description = "Met à jour les informations d'une division existante.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Division mise à jour"),
            @ApiResponse(responseCode = "404", description = "Division introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_update:divisions')")
    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Division> updateDivision(
            @PathVariable Long id,
            @RequestPart("data") String json,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {

        DivisionUpdateDTO dto = objectMapper.readValue(json, DivisionUpdateDTO.class);
        Division updated = divisionService.updateDivision(id, dto, image);
        return ResponseEntity.ok(updated);
    }

    @Operation(summary = "Désactive une division", description = "Désactive une division (soft delete).")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Division désactivée"),
            @ApiResponse(responseCode = "404", description = "Division introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_delete:divisions')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        divisionService.deactivateDivision(id);
        return ResponseEntity.noContent().build();
    }
}