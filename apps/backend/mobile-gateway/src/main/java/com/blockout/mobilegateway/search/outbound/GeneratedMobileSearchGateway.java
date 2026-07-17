package com.blockout.mobilegateway.search.outbound;

import com.blockout.mobilegateway.search.application.MobileSearchGateway;
import com.blockout.mobilegateway.search.application.MobileSearchWorkflow;
import com.blockout.mobilegateway.searchclient.api.SearchClient;
import com.blockout.mobilegateway.shared.outbound.DownstreamClientSupport;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

@Component
public class GeneratedMobileSearchGateway implements MobileSearchGateway {

    private final SearchClient userClient;
    private final SearchClient m2mClient;

    public GeneratedMobileSearchGateway(
            @Qualifier("searchUserClient") SearchClient userClient,
            @Qualifier("searchM2mClient") SearchClient m2mClient) {
        this.userClient = userClient;
        this.m2mClient = m2mClient;
    }

    @Override
    public List<MobileSearchWorkflow.ClubResult> clubs(String query) {
        var response = client().searchClubs(query);
        return response.getItems().stream()
                .map(item -> new MobileSearchWorkflow.ClubResult(
                        item.getId(), item.getName(), item.getLogoUrl(), item.getCity()))
                .toList();
    }

    @Override
    public List<MobileSearchWorkflow.TeamResult> teams(MobileSearchWorkflow.Filters filters) {
        var response = client().searchTeams(
                filters.query(), filters.season(), filters.divisionId(), filters.format(), filters.gender());
        return response.getItems().stream()
                .map(item -> new MobileSearchWorkflow.TeamResult(
                        item.getId(), item.getName(), item.getLogoUrl(), item.getDivisionName(), item.getFormat(),
                        item.getGender(), item.getSeason()))
                .toList();
    }

    @Override
    public List<MobileSearchWorkflow.PoolResult> pools(MobileSearchWorkflow.Filters filters) {
        var response = client().searchPools(
                filters.query(), filters.season(), filters.divisionId(), filters.format(), filters.gender());
        return response.getItems().stream()
                .map(item -> new MobileSearchWorkflow.PoolResult(
                        item.getId(), item.getName(), item.getDivisionName(), item.getLeagueCode(), item.getLeagueName(),
                        item.getSeason(), item.getFormat(), item.getGender(), item.getLogoUrl()))
                .toList();
    }

    private SearchClient client() {
        return DownstreamClientSupport.hasUserJwt() ? userClient : m2mClient;
    }
}
