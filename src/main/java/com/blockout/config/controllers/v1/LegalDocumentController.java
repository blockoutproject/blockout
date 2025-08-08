package com.blockout.config.controllers.v1;

import com.blockout.config.models.LegalDocument;
import com.blockout.config.models.dto.UpdateLegalDocumentDTO;
import com.blockout.config.services.LegalDocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/config/legal")
public class LegalDocumentController {

    private final LegalDocumentService service;

    @Operation(summary = "Récupère un document légal", description = "Renvoie un document (terms, privacy, imprint) au format complet.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Document trouvé"),
            @ApiResponse(responseCode = "404", description = "Document introuvable")
    })
    @GetMapping("/{type}")
    public ResponseEntity<LegalDocument> getLegalDocument(
            @Parameter(description = "Type du document : terms | privacy | imprint") @PathVariable String type) {
        LegalDocument doc = service.getByType(type);
        return ResponseEntity.ok(doc);
    }

    @Operation(summary = "Met à jour un document légal", description = "Modifie un document existant (terms, privacy, imprint)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Document mis à jour"),
            @ApiResponse(responseCode = "404", description = "Document introuvable")
    })
    @PutMapping("/{type}")
    @PreAuthorize("hasAuthority('SCOPE_update:legal')")
    public ResponseEntity<LegalDocument> updateLegal(
            @PathVariable String type,
            @RequestBody UpdateLegalDocumentDTO dto) {
        LegalDocument updated = service.updateLegalDocument(type, dto);
        return ResponseEntity.ok(updated);
    }
}