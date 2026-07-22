package com.blockout.config.legaldocument.api;

import com.blockout.config.legaldocument.api.mappers.LegalDocumentApiMapper;
import com.blockout.config.legaldocument.application.LegalDocumentService;
import com.blockout.config.contract.api.LegalDocumentApi;
import com.blockout.config.contract.model.LegalDocumentInternalResponse;
import com.blockout.config.contract.model.UpdateLegalDocumentInternalRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

/**
 * Implements the generated V1 LegalDocument API.
 */
@RestController
@RequiredArgsConstructor
public class LegalDocumentController implements LegalDocumentApi {

    private final LegalDocumentService legalDocumentService;
    private final LegalDocumentApiMapper mapper;

    /**
     * Returns one legal document by its stable type.
     */
    @Override
    public ResponseEntity<LegalDocumentInternalResponse> getLegalDocumentByType(String type) {
        return ResponseEntity.ok(mapper.toInternalResponse(legalDocumentService.getByType(type)));
    }

    /**
     * Applies a partial update to a legal document.
     */
    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:legal')")
    public ResponseEntity<LegalDocumentInternalResponse> updateLegalDocument(
        String type, UpdateLegalDocumentInternalRequest request) {
        return ResponseEntity.ok(mapper.toInternalResponse(
            legalDocumentService.update(type, mapper.toCommand(request))));
    }
}
