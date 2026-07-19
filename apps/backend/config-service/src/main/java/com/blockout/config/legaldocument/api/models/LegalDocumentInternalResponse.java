package com.blockout.config.legaldocument.api.models;

import java.time.LocalDateTime;

/** Complete V1 LegalDocument response owned by config-service. */
public record LegalDocumentInternalResponse(
        Long id, String type, String title, String version, String content,
        LocalDateTime createdAt, LocalDateTime lastUpdate) {
}
