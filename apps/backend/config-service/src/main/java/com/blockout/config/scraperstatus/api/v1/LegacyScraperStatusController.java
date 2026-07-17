package com.blockout.config.scraperstatus.api.v1;

import com.blockout.config.scraperstatus.application.ScraperStatusService;
import com.blockout.config.scraperstatus.application.ScraperStatusView;
import com.blockout.config.shared.api.v1.LegacyConfigJson;
import com.blockout.shared.model.ScraperNameEnum;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/config/scrapers", produces = MediaType.APPLICATION_JSON_VALUE)
public class LegacyScraperStatusController {

    private final ScraperStatusService service;
    private final LegacyConfigJson json;

    @GetMapping("/{name}/status")
    public ResponseEntity<String> getStatus(@PathVariable ScraperNameEnum name) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(response(service.get(name))));
    }

    @PutMapping("/{name}/enabled")
    @PreAuthorize("hasAuthority('SCOPE_update:scrapers')")
    public ResponseEntity<String> updateStatus(
            @PathVariable ScraperNameEnum name,
            @RequestParam boolean enabled) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(response(service.update(name, enabled))));
    }

    @GetMapping("/status")
    @PreAuthorize("hasAuthority('SCOPE_read:scrapers')")
    public ResponseEntity<String> listAll() throws JsonProcessingException {
        return ResponseEntity.ok(json.write(service.findAll().stream().map(this::response).toList()));
    }

    private LegacyScraperStatus response(ScraperStatusView view) {
        return new LegacyScraperStatus(view.id(), view.name(), view.enabled(), view.lastUpdate());
    }

    record LegacyScraperStatus(Long id, ScraperNameEnum name, boolean enabled, LocalDateTime lastUpdate) {
    }
}
