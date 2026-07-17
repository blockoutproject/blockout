package com.blockout.config.legal.application;

import java.time.LocalDateTime;

public record LegalDocumentSnapshot(
        Long id,
        String type,
        String title,
        String version,
        String content,
        LocalDateTime createdAt,
        LocalDateTime lastUpdate) {
}
