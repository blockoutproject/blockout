package com.blockout.search.club.application;

/** Application-owned club autocomplete projection. */
public record ClubSearchResult(
        String id,
        String name,
        String logoUrl,
        String city) {
}
