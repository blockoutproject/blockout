package com.blockout.config.appstatus.api.v1;

import com.blockout.config.appstatus.application.AppStatusService;
import com.blockout.config.appstatus.application.AppStatusView;
import com.blockout.config.appstatus.application.UpdateAppStatusCommand;
import com.blockout.config.shared.api.v1.LegacyConfigJson;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/config/app-status", produces = MediaType.APPLICATION_JSON_VALUE)
public class LegacyAppStatusController {

    private final AppStatusService service;
    private final LegacyConfigJson json;

    @GetMapping
    public ResponseEntity<String> getStatus() throws JsonProcessingException {
        return ResponseEntity.ok(json.write(response(service.get())));
    }

    @PutMapping(consumes = {MediaType.APPLICATION_JSON_VALUE, "application/*+json"})
    @PreAuthorize("hasAuthority('SCOPE_update:maintenance')")
    public ResponseEntity<String> updateStatus(@RequestBody String body) throws JsonProcessingException {
        LegacyUpdateAppStatusRequest request = json.read(body, LegacyUpdateAppStatusRequest.class);
        AppStatusView view = service.update(new UpdateAppStatusCommand(
                request.maintenance(), request.message(), request.imageUrl(), request.minVersionIos(),
                request.minVersionAndroid(), request.storeUrlIos(), request.storeUrlAndroid(),
                request.forceUpdateMessage()));
        return ResponseEntity.ok(json.write(response(view)));
    }

    private LegacyAppStatusResponse response(AppStatusView view) {
        return new LegacyAppStatusResponse(
                view.maintenance(), view.message(), view.imageUrl(), view.minVersionIos(), view.minVersionAndroid(),
                view.storeUrlIos(), view.storeUrlAndroid(), view.forceUpdateMessage(), view.lastUpdate());
    }

    record LegacyUpdateAppStatusRequest(
            Boolean maintenance,
            String message,
            String imageUrl,
            String minVersionIos,
            String minVersionAndroid,
            String storeUrlIos,
            String storeUrlAndroid,
            String forceUpdateMessage) {
    }

    record LegacyAppStatusResponse(
            boolean maintenance,
            String message,
            String imageUrl,
            String minVersionIos,
            String minVersionAndroid,
            String storeUrlIos,
            String storeUrlAndroid,
            String forceUpdateMessage,
            Instant lastUpdate) {
    }
}
