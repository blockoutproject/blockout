package com.blockout.search.search.api;

import com.blockout.search.search.api.mappers.SearchApiMapper;
import com.blockout.search.search.api.models.TeamSearchInternalResponse;
import com.blockout.search.search.application.SearchApplicationService;
import com.blockout.search.search.application.queries.FilteredSearchQuery;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Implements the generated V1 internal Team search API. */
@RestController
@RequiredArgsConstructor
public class TeamSearchController implements TeamSearchApi {

    private final SearchApplicationService searchApplicationService;

    @Override
    public ResponseEntity<List<TeamSearchInternalResponse>> searchTeams(
        String query,
        String season,
        Long divisionId,
        FormatEnum format,
        GenderEnum gender) {
        var searchQuery = new FilteredSearchQuery(
            query,
            season,
            divisionId,
            format == null ? null : format.name(),
            gender == null ? null : gender.name());
        return ResponseEntity.ok(
            searchApplicationService.searchTeams(searchQuery).stream()
                .map(SearchApiMapper::toInternalResponse)
                .toList());
    }
}
