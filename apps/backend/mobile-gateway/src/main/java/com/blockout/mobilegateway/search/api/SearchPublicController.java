package com.blockout.mobilegateway.search.api;

import com.blockout.mobilegateway.search.api.mappers.SearchApiMapper;
import com.blockout.mobilegateway.api.SearchPublicApi;
import com.blockout.mobilegateway.api.models.ClubSearchResponse;
import com.blockout.mobilegateway.api.models.PoolSearchResponse;
import com.blockout.mobilegateway.api.models.TeamSearchResponse;
import com.blockout.mobilegateway.search.application.SearchApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Exposes public Search operations through the generated mobile contract. */
@RestController
@RequiredArgsConstructor
public class SearchPublicController implements SearchPublicApi {

    private final SearchApplicationService searchService;
    private final SearchApiMapper mapper;

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<List<ClubSearchResponse>> searchClubs(String query) {
        List<ClubSearchResponse> results = searchService.searchClubs(query).stream().map(mapper::toResponse).toList();
        return results.isEmpty() ? ResponseEntity.noContent().build() : ResponseEntity.ok(results);
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<List<TeamSearchResponse>> searchTeams(
            String query, String season, Long divisionId, String format, String gender) {
        List<TeamSearchResponse> results = searchService.searchTeams(query, season, divisionId, format, gender)
            .stream().map(mapper::toResponse).toList();
        return results.isEmpty() ? ResponseEntity.noContent().build() : ResponseEntity.ok(results);
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<List<PoolSearchResponse>> searchPools(
            String query, String season, Long divisionId, String format, String gender) {
        List<PoolSearchResponse> results = searchService.searchPools(query, season, divisionId, format, gender)
            .stream().map(mapper::toResponse).toList();
        return results.isEmpty() ? ResponseEntity.noContent().build() : ResponseEntity.ok(results);
    }
}
