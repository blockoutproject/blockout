package com.blockout.config.legal.api.v2;

import com.blockout.config.generated.api.LegalDocumentsApi;
import com.blockout.config.generated.model.LegalDocumentInternalResponse;
import com.blockout.config.generated.model.UpdateLegalDocumentInternalRequest;
import com.blockout.config.legal.application.LegalDocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class LegalDocumentV2Controller implements LegalDocumentsApi {

    private final LegalDocumentService service;
    private final LegalDocumentApiMapper mapper;

    @Override
    public ResponseEntity<LegalDocumentInternalResponse> getLegalDocument(String type) {
        return ResponseEntity.ok(mapper.toResponse(service.getByType(type)));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:legal')")
    public ResponseEntity<LegalDocumentInternalResponse> updateLegalDocument(
            String type,
            UpdateLegalDocumentInternalRequest request) {
        return ResponseEntity.ok(mapper.toResponse(service.update(type, mapper.toCommand(request))));
    }
}
