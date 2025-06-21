package com.blockout.config.controllers.v1;

import com.blockout.config.models.RawDivisionMapping;
import com.blockout.config.models.dto.RawDivisionMappingUpdateDTO;
import com.blockout.config.services.RawDivisionMappingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.Optional;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/config/raw-divisions")
public class RawDivisionMappingController {

    private final RawDivisionMappingService service;

    @Operation(summary = "Create a raw division mapping", description = "Creates a new raw division mapping.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Raw division mapping created"),
            @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    @PostMapping
    public ResponseEntity<RawDivisionMapping> create(@RequestBody RawDivisionMapping rawPoolMapping) {
        RawDivisionMapping created = service.create(rawPoolMapping);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @Operation(summary = "List raw division mappings", description = "Returns all raw division mappings. Optional filters: leagueCode, season")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Raw division mappings returned"),
            @ApiResponse(responseCode = "204", description = "No raw division mapping found")
    })
    @GetMapping
    public ResponseEntity<List<RawDivisionMapping>> list(
            @RequestParam(required = false, name = "league_code") String leagueCode,
            @RequestParam(required = false) Integer season) {
        List<RawDivisionMapping> mappings = service.findByLeagueCodeAndSeason(leagueCode, season);
        return ResponseEntity.ok(mappings);
    }

    @Operation(summary = "Get raw division mapping by ID", description = "Returns a raw division mapping by its ID.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Raw division mapping found"),
            @ApiResponse(responseCode = "404", description = "Raw division mapping not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<RawDivisionMapping> getById(@PathVariable Long id) {
        return service.getById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Update raw division mapping", description = "Updates a raw division mapping.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Raw division mapping updated"),
        @ApiResponse(responseCode = "404", description = "Raw division mapping not found")
    })
    @PutMapping("/{id}")
    public ResponseEntity<RawDivisionMapping> update(
            @PathVariable Long id,
            @RequestBody RawDivisionMappingUpdateDTO dto
    ) {
        Optional<RawDivisionMapping> updated = service.update(id, dto);
        return updated.map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
    }
}