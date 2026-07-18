package com.blockout.search.club.application;

/** Application-owned club autocomplete view. */
public record ClubSearchView(
        String id,
        String name,
        String logoUrl,
        String city) {
}
