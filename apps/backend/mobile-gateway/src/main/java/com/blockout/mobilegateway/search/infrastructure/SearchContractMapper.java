package com.blockout.mobilegateway.search.infrastructure;

import com.blockout.mobilegateway.search.application.views.ClubSearchView;
import com.blockout.mobilegateway.search.application.views.PoolSearchView;
import com.blockout.mobilegateway.search.application.views.TeamSearchView;
import org.springframework.stereotype.Component;

/** Maps generated Search transport models to the gateway's public models. */
@Component
public class SearchContractMapper {

    public ClubSearchView toResponse(
        com.blockout.mobilegateway.search.infrastructure.contract.models.ClubSearchInternalResponse response) {
        return new ClubSearchView(response.getId(), response.getName(), response.getLogoUrl(), response.getCity());
    }

    public TeamSearchView toResponse(
        com.blockout.mobilegateway.search.infrastructure.contract.models.TeamSearchInternalResponse response) {
        return new TeamSearchView(
            response.getId(), response.getName(), response.getShortName(), response.getClubId(), response.getClubName(),
            response.getClubCity(), response.getLogoUrl(), response.getDivisionName(), response.getFormat().name(),
            response.getGender().name(), response.getSeason());
    }

    public PoolSearchView toResponse(
        com.blockout.mobilegateway.search.infrastructure.contract.models.PoolSearchInternalResponse response) {
        return new PoolSearchView(
            response.getId(), response.getName(), response.getShortName(), response.getDivisionName(),
            response.getLeagueCode(), response.getLeagueName(), response.getSeason(), response.getFormat().name(),
            response.getGender().name(), response.getLogoUrl());
    }
}
