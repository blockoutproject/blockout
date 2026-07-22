package com.blockout.config.scraperstatus.api;

import com.blockout.config.scraperstatus.api.mappers.ScraperStatusApiMapper;
import com.blockout.config.scraperstatus.application.ScraperStatusService;
import com.blockout.config.scraperstatus.application.models.ScraperName;
import com.blockout.config.contract.api.ScraperStatusApi;
import com.blockout.config.contract.model.ScraperStatusInternalResponse;
import com.blockout.shared.model.ScraperNameEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Implements the generated V1 ScraperStatus API.
 */
@RestController
@RequiredArgsConstructor
public class ScraperStatusController implements ScraperStatusApi {

    private final ScraperStatusService scraperStatusService;
    private final ScraperStatusApiMapper mapper;

    /**
     * Returns one scraper status by its stable name.
     */
    @Override
    public ResponseEntity<ScraperStatusInternalResponse> getScraperStatus(ScraperNameEnum name) {
        return ResponseEntity.ok(mapper.toInternalResponse(scraperStatusService.getStatus(toApplicationName(name))));
    }

    /**
     * Enables or disables one scraper.
     */
    @PreAuthorize("hasAuthority('SCOPE_update:scrapers')")
    @Override
    public ResponseEntity<ScraperStatusInternalResponse> updateScraperStatus(
        ScraperNameEnum name, Boolean enabled) {
        return ResponseEntity.ok(mapper.toInternalResponse(
            scraperStatusService.updateStatus(toApplicationName(name), enabled)));
    }

    /**
     * Lists every configured scraper status.
     */
    @PreAuthorize("hasAuthority('SCOPE_read:scrapers')")
    @Override
    public ResponseEntity<List<ScraperStatusInternalResponse>> listScraperStatuses() {
        return ResponseEntity.ok(scraperStatusService.findAll().stream().map(mapper::toInternalResponse).toList());
    }

    private ScraperName toApplicationName(ScraperNameEnum name) {
        return ScraperName.valueOf(name.name());
    }
}
