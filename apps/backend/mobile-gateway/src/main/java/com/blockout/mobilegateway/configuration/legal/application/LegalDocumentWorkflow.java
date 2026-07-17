package com.blockout.mobilegateway.configuration.legal.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LegalDocumentWorkflow {

    private final LegalDocumentGateway gateway;

    public LegalDocumentView getByType(String type) {
        return gateway.getByType(type);
    }

    public LegalDocumentView update(String type, UpdateLegalDocumentCommand command) {
        return gateway.update(type, command);
    }
}
