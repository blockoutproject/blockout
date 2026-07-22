package com.blockout.mobilegateway.config.application.views;

import java.time.LocalDateTime;

/** Legal document projection used by the gateway application layer. */
public record LegalDocumentView(
        Long id,
        String type,
        String title,
        String version,
        String content,
        LocalDateTime createdAt,
        LocalDateTime lastUpdate) {
}
