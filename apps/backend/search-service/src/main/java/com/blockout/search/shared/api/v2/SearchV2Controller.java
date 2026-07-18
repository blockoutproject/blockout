package com.blockout.search.shared.api.v2;

import com.blockout.search.club.application.ClubSearchService;
import com.blockout.search.generated.api.SearchApi;
import com.blockout.search.generated.model.ClubSearchInternalListResponse;
import com.blockout.search.generated.model.PoolSearchInternalListResponse;
import com.blockout.search.generated.model.TeamSearchInternalListResponse;
import com.blockout.search.pool.application.PoolSearchService;
import com.blockout.search.shared.application.FilteredSearchQuery;
import com.blockout.search.shared.application.SearchFilters;
import com.blockout.search.shared.application.SearchQuery;
import com.blockout.search.team.application.TeamSearchService;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Implements the generated canonical search boundary. */
@RestController
@RequiredArgsConstructor
public class SearchV2Controller implements SearchApi {

    private final ClubSearchService clubs;
    private final TeamSearchService teams;
    private final PoolSearchService pools;
    private final SearchApiMapper mapper;

    @Override
    public ResponseEntity<ClubSearchInternalListResponse> searchClubs(String query) {
        return ResponseEntity.ok(new ClubSearchInternalListResponse(
                clubs.search(new SearchQuery(query)).stream().map(mapper::toResponse).toList()));
    }

    @Override
    public ResponseEntity<TeamSearchInternalListResponse> searchTeams(
            String query,
            String season,
            Long divisionId,
            FormatEnum format,
            GenderEnum gender) {
        return ResponseEntity.ok(new TeamSearchInternalListResponse(
                teams.search(filteredQuery(query, season, divisionId, format, gender)).stream()
                        .map(mapper::toResponse)
                        .toList()));
    }

    @Override
    public ResponseEntity<PoolSearchInternalListResponse> searchPools(
            String query,
            String season,
            Long divisionId,
            FormatEnum format,
            GenderEnum gender) {
        return ResponseEntity.ok(new PoolSearchInternalListResponse(
                pools.search(filteredQuery(query, season, divisionId, format, gender)).stream()
                        .map(mapper::toResponse)
                        .toList()));
    }

    private FilteredSearchQuery filteredQuery(
            String query,
            String season,
            Long divisionId,
            FormatEnum format,
            GenderEnum gender) {
        return new FilteredSearchQuery(
                new SearchQuery(query),
                new SearchFilters(
                        season,
                        divisionId,
                        format == null ? null : format.getValue(),
                        gender == null ? null : gender.getValue()));
    }
}
