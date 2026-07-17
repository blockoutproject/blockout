package com.blockout.config.appstatus.api.v2;

import com.blockout.config.appstatus.application.AppStatusService;
import com.blockout.config.generated.api.AppStatusApi;
import com.blockout.config.generated.model.AppStatusInternalResponse;
import com.blockout.config.generated.model.UpdateAppStatusInternalRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class AppStatusV2Controller implements AppStatusApi {

    private final AppStatusService service;
    private final AppStatusApiMapper mapper;

    @Override
    public ResponseEntity<AppStatusInternalResponse> getAppStatus() {
        return ResponseEntity.ok(mapper.toResponse(service.get()));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:maintenance')")
    public ResponseEntity<AppStatusInternalResponse> updateAppStatus(UpdateAppStatusInternalRequest request) {
        return ResponseEntity.ok(mapper.toResponse(service.update(mapper.toCommand(request))));
    }
}
