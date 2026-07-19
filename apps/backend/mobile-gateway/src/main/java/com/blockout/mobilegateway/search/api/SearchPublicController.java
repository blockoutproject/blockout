package com.blockout.mobilegateway.search.api;

import com.blockout.mobilegateway.search.api.models.ClubSearchResponse;
import com.blockout.mobilegateway.search.api.models.PoolSearchResponse;
import com.blockout.mobilegateway.search.api.models.TeamSearchResponse;
import com.blockout.mobilegateway.search.application.SearchApplicationService;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/public/search")
public class SearchPublicController {

    private final SearchApplicationService searchService;

    @GetMapping("/clubs")
    public ResponseEntity<List<ClubSearchResponse>> searchClubs(
            @RequestParam String query) {
        List<ClubSearchResponse> results = searchService.searchClubs(query);
        return results.isEmpty() ? ResponseEntity.noContent().build() : ResponseEntity.ok(results);
    }

    @GetMapping("/teams")
    public ResponseEntity<List<TeamSearchResponse>> searchTeams(
            @RequestParam String query,
            @RequestParam(required = false) String season,
            @RequestParam(required = false, name = "divisionId") Long divisionId,
            @RequestParam(required = false) String format,
            @RequestParam(required = false) String gender
    ) {
        List<TeamSearchResponse> results = searchService.searchTeams(query, season, divisionId, format, gender);
        return results.isEmpty()
                ? ResponseEntity.noContent().build()
                : ResponseEntity.ok(results);
    }

    @GetMapping("/pools")
    public ResponseEntity<List<PoolSearchResponse>> searchPools(
            @RequestParam String query,
            @RequestParam(required = false) String season,
            @RequestParam(required = false, name = "divisionId") Long divisionId,
            @RequestParam(required = false) String format,
            @RequestParam(required = false) String gender) {
        List<PoolSearchResponse> results = searchService.searchPools(query, season, divisionId, format, gender);
        return results.isEmpty()
                ? ResponseEntity.noContent().build()
                : ResponseEntity.ok(results);
    }
}