package com.blockout.config.appstatus.api;

import com.blockout.config.appstatus.api.mappers.AppStatusApiMapper;
import com.blockout.config.appstatus.application.AppStatusService;
import com.blockout.config.contract.api.AppStatusApi;
import com.blockout.config.contract.model.AppStatusInternalResponse;
import com.blockout.config.contract.model.UpdateAppStatusInternalRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

/**
 * Implements the generated V1 app-status API.
 */
@RestController
@RequiredArgsConstructor
public class AppStatusController implements AppStatusApi {

    private final AppStatusService appStatusService;
    private final AppStatusApiMapper mapper;

    /**
     * Returns the singleton application status.
     */
    @Override
    public ResponseEntity<AppStatusInternalResponse> getAppStatus() {
        return ResponseEntity.ok(mapper.toInternalResponse(appStatusService.getStatus()));
    }

    /**
     * Applies a partial update to the singleton application status.
     */
    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:maintenance')")
    public ResponseEntity<AppStatusInternalResponse> updateAppStatus(UpdateAppStatusInternalRequest request) {
        return ResponseEntity.ok(mapper.toInternalResponse(appStatusService.updateStatus(mapper.toCommand(request))));
    }
}
