package com.blockout.config.appstatus.api;

import com.blockout.config.appstatus.api.mappers.AppStatusApiMapper;
import com.blockout.config.appstatus.api.models.AppStatusInternalResponse;
import com.blockout.config.appstatus.api.models.UpdateAppStatusInternalRequest;
import com.blockout.config.appstatus.application.AppStatusService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Exposes the handwritten V1 app-status API.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/config/app-status")
public class AppStatusController {

    private final AppStatusService appStatusService;
    private final AppStatusApiMapper mapper;

    /**
     * Returns the singleton application status.
     */
    @GetMapping
    public ResponseEntity<AppStatusInternalResponse> getStatus() {
        return ResponseEntity.ok(mapper.toInternalResponse(appStatusService.getStatus()));
    }

    /**
     * Applies a partial update to the singleton application status.
     */
    @PutMapping
    @PreAuthorize("hasAuthority('SCOPE_update:maintenance')")
    public ResponseEntity<AppStatusInternalResponse> updateStatus(
        @RequestBody UpdateAppStatusInternalRequest request) {
        return ResponseEntity.ok(mapper.toInternalResponse(appStatusService.updateStatus(mapper.toCommand(request))));
    }
}
