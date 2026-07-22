package com.blockout.mobilegateway.search.application.views;

/** Team search result used by the gateway application layer. */
public record TeamSearchView(
        Long id,
        String name,
        String shortName,
        String clubId,
        String clubName,
        String clubCity,
        String logoUrl,
        String divisionName,
        String format,
        String gender,
        String season) {
}
