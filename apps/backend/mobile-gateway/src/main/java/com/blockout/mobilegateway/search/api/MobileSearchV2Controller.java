package com.blockout.mobilegateway.search.api;

import com.blockout.mobilegateway.generated.api.MobileSearchApi;
import com.blockout.mobilegateway.generated.model.MobileClubSearchListResponse;
import com.blockout.mobilegateway.generated.model.MobileClubSearchResult;
import com.blockout.mobilegateway.generated.model.MobilePoolSearchListResponse;
import com.blockout.mobilegateway.generated.model.MobilePoolSearchResult;
import com.blockout.mobilegateway.generated.model.MobileTeamSearchListResponse;
import com.blockout.mobilegateway.generated.model.MobileTeamSearchResult;
import com.blockout.mobilegateway.search.application.MobileSearchWorkflow;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MobileSearchV2Controller implements MobileSearchApi {

    private final MobileSearchWorkflow workflow;

    @Override
    public ResponseEntity<MobileClubSearchListResponse> searchMobileClubs(String query) {
        return ResponseEntity.ok(new MobileClubSearchListResponse(workflow.clubs(query).stream()
                .map(item -> new MobileClubSearchResult(item.id(), item.name(), item.logoUrl(), item.city()))
                .toList()));
    }

    @Override
    public ResponseEntity<MobileTeamSearchListResponse> searchMobileTeams(
            String query, String season, Long divisionId, FormatEnum format, GenderEnum gender) {
        var filters = new MobileSearchWorkflow.Filters(query, season, divisionId, format, gender);
        return ResponseEntity.ok(new MobileTeamSearchListResponse(workflow.teams(filters).stream()
                .map(item -> new MobileTeamSearchResult(
                        item.id(), item.name(), item.logoUrl(), item.divisionName(), item.format(), item.gender(),
                        item.season()))
                .toList()));
    }

    @Override
    public ResponseEntity<MobilePoolSearchListResponse> searchMobilePools(
            String query, String season, Long divisionId, FormatEnum format, GenderEnum gender) {
        var filters = new MobileSearchWorkflow.Filters(query, season, divisionId, format, gender);
        return ResponseEntity.ok(new MobilePoolSearchListResponse(workflow.pools(filters).stream()
                .map(item -> new MobilePoolSearchResult(
                        item.id(), item.name(), item.divisionName(), item.leagueCode(), item.leagueName(), item.season(),
                        item.format(), item.gender(), item.logoUrl()))
                .toList()));
    }
}
