package com.blockout.mobilegateway.search.infrastructure;

import com.blockout.mobilegateway.search.api.models.ClubSearchResponse;
import com.blockout.mobilegateway.search.api.models.PoolSearchResponse;
import com.blockout.mobilegateway.search.api.models.TeamSearchResponse;
import org.springframework.stereotype.Component;

/** Maps generated Search transport models to the gateway's public models. */
@Component
public class SearchContractMapper {

    public ClubSearchResponse toResponse(
        com.blockout.mobilegateway.search.infrastructure.contract.models.ClubSearchInternalResponse response) {
        return new ClubSearchResponse(response.getId(), response.getName(), response.getLogoUrl(), response.getCity());
    }

    public TeamSearchResponse toResponse(
        com.blockout.mobilegateway.search.infrastructure.contract.models.TeamSearchInternalResponse response) {
        return new TeamSearchResponse(
            response.getId(), response.getName(), response.getShortName(), response.getClubId(), response.getClubName(),
            response.getClubCity(), response.getLogoUrl(), response.getDivisionName(), response.getFormat().name(),
            response.getGender().name(), response.getSeason());
    }

    public PoolSearchResponse toResponse(
        com.blockout.mobilegateway.search.infrastructure.contract.models.PoolSearchInternalResponse response) {
        return new PoolSearchResponse(
            response.getId(), response.getName(), response.getShortName(), response.getDivisionName(),
            response.getLeagueCode(), response.getLeagueName(), response.getSeason(), response.getFormat().name(),
            response.getGender().name(), response.getLogoUrl());
    }
}
