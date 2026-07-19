package com.blockout.config.legaldocument.application.views;

import java.time.LocalDateTime;

/** Authoritative application view of a LegalDocument. */
public record LegalDocumentView(
        Long id, String type, String title, String version, String content,
        LocalDateTime createdAt, LocalDateTime lastUpdate) {
}
