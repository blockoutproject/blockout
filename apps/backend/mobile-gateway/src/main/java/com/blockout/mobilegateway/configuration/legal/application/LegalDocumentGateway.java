package com.blockout.mobilegateway.configuration.legal.application;

public interface LegalDocumentGateway {

    LegalDocumentView getByType(String type);

    LegalDocumentView update(String type, UpdateLegalDocumentCommand command);
}
