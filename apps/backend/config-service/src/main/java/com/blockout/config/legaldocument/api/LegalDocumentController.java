package com.blockout.config.legaldocument.api;

import com.blockout.config.legaldocument.api.mappers.LegalDocumentApiMapper;
import com.blockout.config.legaldocument.api.models.LegalDocumentInternalResponse;
import com.blockout.config.legaldocument.api.models.UpdateLegalDocumentInternalRequest;
import com.blockout.config.legaldocument.application.LegalDocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Exposes the handwritten V1 LegalDocument API. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/config/legal")
public class LegalDocumentController {

    private final LegalDocumentService legalDocumentService;
    private final LegalDocumentApiMapper mapper;

    /** Returns one legal document by its stable type. */
    @GetMapping("/{type}")
    public ResponseEntity<LegalDocumentInternalResponse> getByType(@PathVariable String type) {
        return ResponseEntity.ok(mapper.toInternalResponse(legalDocumentService.getByType(type)));
    }

    /** Applies a partial update to a legal document. */
    @PutMapping("/{type}")
    @PreAuthorize("hasAuthority('SCOPE_update:legal')")
    public ResponseEntity<LegalDocumentInternalResponse> update(
            @PathVariable String type,
            @RequestBody UpdateLegalDocumentInternalRequest request) {
        return ResponseEntity.ok(mapper.toInternalResponse(
                legalDocumentService.update(type, mapper.toCommand(request))));
    }
}
