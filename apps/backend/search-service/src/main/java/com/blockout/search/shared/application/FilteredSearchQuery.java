package com.blockout.search.shared.application;

/** Separates raw search text from the exact optional filter set. */
public record FilteredSearchQuery(
        SearchQuery query,
        SearchFilters filters) {
}
