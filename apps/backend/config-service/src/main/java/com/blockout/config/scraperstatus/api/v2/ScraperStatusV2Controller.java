package com.blockout.config.scraperstatus.api.v2;

import com.blockout.config.generated.api.ScraperStatusesApi;
import com.blockout.config.generated.model.ScraperStatusInternalListResponse;
import com.blockout.config.generated.model.ScraperStatusInternalResponse;
import com.blockout.config.scraperstatus.application.ScraperStatusService;
import com.blockout.shared.model.ScraperNameEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ScraperStatusV2Controller implements ScraperStatusesApi {

    private final ScraperStatusService service;
    private final ScraperStatusApiMapper mapper;

    @Override
    public ResponseEntity<ScraperStatusInternalResponse> getScraperStatus(ScraperNameEnum name) {
        return ResponseEntity.ok(mapper.toResponse(service.get(name)));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:scrapers')")
    public ResponseEntity<ScraperStatusInternalResponse> updateScraperEnabled(
            ScraperNameEnum name,
            Boolean enabled) {
        return ResponseEntity.ok(mapper.toResponse(service.update(name, enabled)));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:scrapers')")
    public ResponseEntity<ScraperStatusInternalListResponse> listScraperStatuses() {
        return ResponseEntity.ok(new ScraperStatusInternalListResponse(
                service.findAll().stream().map(mapper::toResponse).toList()));
    }
}
