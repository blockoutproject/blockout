package com.blockout.search.shared.application;

/** Preserves the current permissive search text and exact optional filters. */
public record SearchFilters(
        String query,
        String season,
        Long divisionId,
        String format,
        String gender) {
}
