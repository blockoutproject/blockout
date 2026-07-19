package com.blockout.search.search.api;

import com.blockout.search.search.api.mappers.SearchApiMapper;
import com.blockout.search.search.api.models.TeamSearchInternalResponse;
import com.blockout.search.search.application.SearchApplicationService;
import com.blockout.search.search.application.queries.FilteredSearchQuery;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/search/teams")
public class TeamSearchController {

    private final SearchApplicationService searchApplicationService;

    @Operation(summary = "Search teams", description = "Search teams with optional season and division filters.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Search completed"),
        @ApiResponse(responseCode = "204", description = "No result found")
    })
    @GetMapping
    public ResponseEntity<List<TeamSearchInternalResponse>> search(
            @RequestParam String query,
            @RequestParam(required = false) String season,
            @RequestParam(required = false, name = "divisionId") Long divisionId,
            @RequestParam(required = false) String format,
            @RequestParam(required = false) String gender) {
        var searchQuery = new FilteredSearchQuery(query, season, divisionId, format, gender);
        return ResponseEntity.ok(
                searchApplicationService.searchTeams(searchQuery).stream()
                        .map(SearchApiMapper::toInternalResponse)
                        .toList());
    }
}
