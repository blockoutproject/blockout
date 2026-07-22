package com.blockout.mobilegateway.config.api;

import com.blockout.mobilegateway.api.ConfigPublicApi;
import com.blockout.mobilegateway.api.models.AppStatusResponse;
import com.blockout.mobilegateway.api.models.DivisionResponse;
import com.blockout.mobilegateway.api.models.LegalDocumentResponse;
import com.blockout.mobilegateway.config.application.ConfigApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Exposes public configuration operations through the generated mobile contract. */
@RestController
@RequiredArgsConstructor
public class ConfigPublicController implements ConfigPublicApi {

    private final ConfigApplicationService configService;
    private final ConfigApiMapper mapper;

    @Override
    public ResponseEntity<AppStatusResponse> getAppStatus() {
        return ResponseEntity.ok(mapper.toResponse(configService.getAppStatus()));
    }

    @Override
    public ResponseEntity<List<DivisionResponse>> listDivisions() {
        return ResponseEntity.ok(configService.listDivisions().stream().map(mapper::toResponse).toList());
    }

    @Override
    public ResponseEntity<DivisionResponse> getDivisionById(Long id) {
        return ResponseEntity.ok(mapper.toResponse(configService.getDivisionById(id)));
    }

    @Override
    public ResponseEntity<LegalDocumentResponse> getLegalDocument(String type) {
        return ResponseEntity.ok(mapper.toResponse(configService.getLegalDocument(type)));
    }
}
