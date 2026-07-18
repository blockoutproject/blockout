package com.blockout.search.shared.application;

/** Preserves the current permissive exact optional filters without normalization. */
public record SearchFilters(
        String season,
        Long divisionId,
        String format,
        String gender) {
}
