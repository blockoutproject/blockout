package com.blockout.config.exceptions;

public class LegalDocumentNotFoundException extends RuntimeException {
    public LegalDocumentNotFoundException(String type) {
        super("LegalDocument not found with type: " + type);
    }
}
