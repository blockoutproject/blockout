package com.blockout.config.legaldocument.api.models;

/**
 * Partial V1 request for updating a legal document.
 */
public record UpdateLegalDocumentInternalRequest(String title, String version, String content) {
}
