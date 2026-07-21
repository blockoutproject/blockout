package com.blockout.search.search.api;

import com.blockout.search.search.api.mappers.SearchApiMapper;
import com.blockout.search.search.api.models.ClubSearchInternalResponse;
import com.blockout.search.search.application.SearchApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/search/clubs")
public class ClubSearchController {

    private final SearchApplicationService searchApplicationService;

    @Operation(summary = "Search clubs", description = "Search clubs across their indexed fields.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Search completed"),
        @ApiResponse(responseCode = "204", description = "No result found")
    })
    @GetMapping
    public ResponseEntity<List<ClubSearchInternalResponse>> search(@RequestParam String query) {
        return ResponseEntity.ok(
            searchApplicationService.searchClubs(query).stream()
                .map(SearchApiMapper::toInternalResponse)
                .toList());
    }
}
