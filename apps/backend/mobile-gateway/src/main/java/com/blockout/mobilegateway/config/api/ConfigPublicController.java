package com.blockout.mobilegateway.config.api;

import com.blockout.mobilegateway.config.api.models.AppStatusResponse;
import com.blockout.mobilegateway.config.api.models.DivisionResponse;
import com.blockout.mobilegateway.config.api.models.LegalDocumentResponse;
import com.blockout.mobilegateway.config.application.ConfigApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/public/config")
public class ConfigPublicController {

    private final ConfigApplicationService configService;

    @GetMapping("/app-status")
    public ResponseEntity<AppStatusResponse> getAppStatus() {
        AppStatusResponse status = configService.getAppStatus();
        return ResponseEntity.ok(status);
    }

    @GetMapping("/divisions")
    public ResponseEntity<List<DivisionResponse>> listAll() {
        return ResponseEntity.ok(configService.listDivisions());
    }

    @GetMapping("/divisions/{id}")
    public ResponseEntity<DivisionResponse> getDivisionById(@PathVariable Long id) {
        return ResponseEntity.ok(configService.getDivisionById(id));
    }

    @GetMapping("/legal/{type}")
    public ResponseEntity<LegalDocumentResponse> getLegalDocument(@PathVariable String type) {
        LegalDocumentResponse doc = configService.getLegalDocument(type);
        return ResponseEntity.ok(doc);
    }
}
