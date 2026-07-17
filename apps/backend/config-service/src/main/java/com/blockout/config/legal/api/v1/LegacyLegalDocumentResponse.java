package com.blockout.config.legal.api.v1;

import java.time.LocalDateTime;

record LegacyLegalDocumentResponse(
        Long id,
        String type,
        String title,
        String version,
        String content,
        LocalDateTime createdAt,
        LocalDateTime lastUpdate) {
}
