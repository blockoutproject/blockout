package com.blockout.mobilegateway.configuration.legal.api;

import com.blockout.mobilegateway.configuration.legal.application.LegalDocumentWorkflow;
import com.blockout.mobilegateway.generated.api.MobileLegalDocumentsApi;
import com.blockout.mobilegateway.generated.model.MobileLegalDocument;
import com.blockout.mobilegateway.generated.model.UpdateMobileLegalDocumentRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class LegalDocumentV2Controller implements MobileLegalDocumentsApi {

    private final LegalDocumentWorkflow workflow;
    private final LegalDocumentApiMapper mapper;

    @Override
    public ResponseEntity<MobileLegalDocument> getMobileLegalDocument(String type) {
        return ResponseEntity.ok(mapper.toResponse(workflow.getByType(type)));
    }

    @Override
    public ResponseEntity<MobileLegalDocument> updateMobileLegalDocument(
            String type,
            UpdateMobileLegalDocumentRequest request) {
        return ResponseEntity.ok(mapper.toResponse(workflow.update(type, mapper.toCommand(request))));
    }
}
