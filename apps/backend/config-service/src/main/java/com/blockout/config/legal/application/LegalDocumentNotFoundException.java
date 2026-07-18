package com.blockout.config.legal.application;

public class LegalDocumentNotFoundException extends RuntimeException {

    public LegalDocumentNotFoundException(String type) {
        super("LegalDocument not found with type: " + type);
    }
}
