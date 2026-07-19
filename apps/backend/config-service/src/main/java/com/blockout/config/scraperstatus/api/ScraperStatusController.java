package com.blockout.config.scraperstatus.api;

import com.blockout.config.scraperstatus.api.mappers.ScraperStatusApiMapper;
import com.blockout.config.scraperstatus.api.models.ScraperStatusInternalResponse;
import com.blockout.config.scraperstatus.application.ScraperStatusService;
import com.blockout.config.scraperstatus.application.models.ScraperName;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Exposes the handwritten V1 ScraperStatus API. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/config/scrapers")
public class ScraperStatusController {

    private final ScraperStatusService scraperStatusService;
    private final ScraperStatusApiMapper mapper;

    /** Returns one scraper status by its stable name. */
    @GetMapping("/{name}/status")
    public ResponseEntity<ScraperStatusInternalResponse> getStatus(@PathVariable ScraperName name) {
        return ResponseEntity.ok(mapper.toInternalResponse(scraperStatusService.getStatus(name)));
    }

    /** Enables or disables one scraper. */
    @PreAuthorize("hasAuthority('SCOPE_update:scrapers')")
    @PutMapping("/{name}/enabled")
    public ResponseEntity<ScraperStatusInternalResponse> updateStatus(
            @PathVariable ScraperName name,
            @RequestParam boolean enabled) {
        return ResponseEntity.ok(mapper.toInternalResponse(scraperStatusService.updateStatus(name, enabled)));
    }

    /** Lists every configured scraper status. */
    @PreAuthorize("hasAuthority('SCOPE_read:scrapers')")
    @GetMapping("/status")
    public ResponseEntity<List<ScraperStatusInternalResponse>> listAll() {
        return ResponseEntity.ok(scraperStatusService.findAll().stream().map(mapper::toInternalResponse).toList());
    }
}
