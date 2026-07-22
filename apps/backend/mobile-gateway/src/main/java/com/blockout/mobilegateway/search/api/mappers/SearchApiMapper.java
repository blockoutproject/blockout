package com.blockout.mobilegateway.search.api.mappers;

import com.blockout.mobilegateway.api.models.ClubSearchResponse;
import com.blockout.mobilegateway.api.models.PoolSearchResponse;
import com.blockout.mobilegateway.api.models.TeamSearchResponse;
import com.blockout.mobilegateway.search.application.views.ClubSearchView;
import com.blockout.mobilegateway.search.application.views.PoolSearchView;
import com.blockout.mobilegateway.search.application.views.TeamSearchView;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import org.springframework.stereotype.Component;

/** Maps Search application data to the generated mobile API contract. */
@Component
public class SearchApiMapper {

    /**
     * Maps a Club search view to the public response.
     *
     * @param source application Club search view.
     * @return generated public response.
     */
    public ClubSearchResponse toResponse(
            ClubSearchView source) {
        return new ClubSearchResponse(source.id(), source.name(), source.city()).logoUrl(source.logoUrl());
    }

    /**
     * Maps a Team search view to the public response.
     *
     * @param source application Team search view.
     * @return generated public response.
     */
    public TeamSearchResponse toResponse(
            TeamSearchView source) {
        return new TeamSearchResponse(
            source.id(), source.name(), source.shortName(), source.clubId(), source.clubName(), source.clubCity(),
            source.divisionName(), FormatEnum.fromValue(source.format()), GenderEnum.fromValue(source.gender()),
            source.season()).logoUrl(source.logoUrl());
    }

    /**
     * Maps a Pool search view to the public response.
     *
     * @param source application Pool search view.
     * @return generated public response.
     */
    public PoolSearchResponse toResponse(
            PoolSearchView source) {
        return new PoolSearchResponse(
            source.id(), source.name(), source.shortName(), source.divisionName(), source.leagueCode(),
            source.leagueName(), source.season(), FormatEnum.fromValue(source.format()),
            GenderEnum.fromValue(source.gender())).logoUrl(source.logoUrl());
    }
}
