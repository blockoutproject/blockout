package com.blockout.search.search.api.mappers;

import com.blockout.search.search.api.models.ClubSearchInternalResponse;
import com.blockout.search.search.api.models.PoolSearchInternalResponse;
import com.blockout.search.search.api.models.TeamSearchInternalResponse;
import com.blockout.search.search.application.views.ClubSearchResult;
import com.blockout.search.search.application.views.PoolSearchResult;
import com.blockout.search.search.application.views.TeamSearchResult;

public final class SearchApiMapper {

    private SearchApiMapper() {}

    public static ClubSearchInternalResponse toInternalResponse(ClubSearchResult result) {
        return new ClubSearchInternalResponse(result.id(), result.name(), result.logoUrl(), result.city());
    }

    public static TeamSearchInternalResponse toInternalResponse(TeamSearchResult result) {
        return new TeamSearchInternalResponse(
                result.id(),
                result.name(),
                result.shortName(),
                result.clubId(),
                result.clubName(),
                result.clubCity(),
                result.logoUrl(),
                result.divisionName(),
                result.format(),
                result.gender(),
                result.season());
    }

    public static PoolSearchInternalResponse toInternalResponse(PoolSearchResult result) {
        return new PoolSearchInternalResponse(
                result.id(),
                result.name(),
                result.shortName(),
                result.divisionName(),
                result.leagueCode(),
                result.leagueName(),
                result.season(),
                result.format(),
                result.gender(),
                result.logoUrl());
    }
}
