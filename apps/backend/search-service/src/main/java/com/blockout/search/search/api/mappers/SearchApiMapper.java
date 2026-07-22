package com.blockout.search.search.api.mappers;

import com.blockout.search.search.api.models.ClubSearchInternalResponse;
import com.blockout.search.search.api.models.PoolSearchInternalResponse;
import com.blockout.search.search.api.models.TeamSearchInternalResponse;
import com.blockout.search.search.application.views.ClubSearchResult;
import com.blockout.search.search.application.views.PoolSearchResult;
import com.blockout.search.search.application.views.TeamSearchResult;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

/** Maps application search results to generated transport models. */
public final class SearchApiMapper {

    private SearchApiMapper() {
    }

    public static ClubSearchInternalResponse toInternalResponse(ClubSearchResult result) {
        return new ClubSearchInternalResponse(result.id(), result.name())
            .logoUrl(result.logoUrl())
            .city(result.city());
    }

    public static TeamSearchInternalResponse toInternalResponse(TeamSearchResult result) {
        return new TeamSearchInternalResponse(
            result.id(),
            result.name(),
            result.clubId(),
            FormatEnum.valueOf(result.format()),
            GenderEnum.valueOf(result.gender()),
            result.season())
            .shortName(result.shortName())
            .clubName(result.clubName())
            .clubCity(result.clubCity())
            .logoUrl(result.logoUrl())
            .divisionName(result.divisionName());
    }

    public static PoolSearchInternalResponse toInternalResponse(PoolSearchResult result) {
        return new PoolSearchInternalResponse(
            result.id(),
            result.name(),
            result.season(),
            FormatEnum.valueOf(result.format()),
            GenderEnum.valueOf(result.gender()))
            .shortName(result.shortName())
            .divisionName(result.divisionName())
            .leagueCode(result.leagueCode())
            .leagueName(result.leagueName())
            .logoUrl(result.logoUrl());
    }
}
