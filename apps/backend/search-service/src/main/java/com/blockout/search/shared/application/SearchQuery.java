package com.blockout.search.shared.application;

/** Carries the raw search text without trimming or normalization. */
public record SearchQuery(String text) {

    public boolean isBlank() {
        return text == null || text.isBlank();
    }
}
