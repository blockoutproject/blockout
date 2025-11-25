package com.blockout.config.controllers.v1;

import com.blockout.config.models.entities.ScraperStatus;
import com.blockout.config.models.enums.ScraperName;
import com.blockout.config.services.ScraperStatusService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/config/scrapers")
public class ScraperStatusController {

    private final ScraperStatusService scraperStatusService;

    @Operation(summary = "Récupère l'état complet d'un scraper", description = "Renvoie l'objet complet du statut du scraper.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Scraper trouvé"),
            @ApiResponse(responseCode = "404", description = "Scraper introuvable")
    })
    @GetMapping("/{name}/status")
    public ResponseEntity<ScraperStatus> getStatus(@PathVariable ScraperName name) {
        ScraperStatus status = scraperStatusService.getScraperStatus(name);
        return ResponseEntity.ok(status);
    }

    @Operation(summary = "Modifie l'état d'un scraper", description = "Active ou désactive un scraper.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "État mis à jour")
    })
    @PreAuthorize("hasAuthority('SCOPE_update:scrapers')")
    @PutMapping("/{name}/enabled")
    public ResponseEntity<ScraperStatus> updateStatus(
            @PathVariable ScraperName name,
            @RequestParam boolean enabled) {
        ScraperStatus updated = scraperStatusService.updateStatus(name, enabled);
        return ResponseEntity.ok(updated);
    }

    @Operation(summary = "Liste tous les scrapers avec leurs statuts", description = "Permet de visualiser tous les scrapers et leur état d'activation.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Liste des statuts renvoyée")
    })
    @PreAuthorize("hasAuthority('SCOPE_read:scrapers')")
    @GetMapping("/status")
    public ResponseEntity<List<ScraperStatus>> listAll() {
        return ResponseEntity.ok(scraperStatusService.findAll());
    }
}