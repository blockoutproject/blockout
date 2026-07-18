package com.blockout.search.shared.api.v1;

import com.blockout.search.club.application.ClubSearchView;
import com.blockout.search.club.application.ClubSearchService;
import com.blockout.search.pool.application.PoolSearchView;
import com.blockout.search.pool.application.PoolSearchService;
import com.blockout.search.shared.application.FilteredSearchQuery;
import com.blockout.search.shared.application.SearchFilters;
import com.blockout.search.shared.application.SearchQuery;
import com.blockout.search.team.application.TeamSearchView;
import com.blockout.search.team.application.TeamSearchService;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Retains the deployed raw-array and snake-case v1 search contract. */
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/search", produces = MediaType.APPLICATION_JSON_VALUE)
public class LegacySearchController {

    private final ClubSearchService clubs;
    private final TeamSearchService teams;
    private final PoolSearchService pools;
    private final LegacySearchJson json;

    @GetMapping("/clubs")
    public ResponseEntity<String> searchClubs(@RequestParam String query) throws JsonProcessingException {
        List<LegacyClubSearchResult> results = clubs.search(new SearchQuery(query)).stream().map(this::response).toList();
        return ResponseEntity.ok(json.write(results));
    }

    @GetMapping("/teams")
    public ResponseEntity<String> searchTeams(
            @RequestParam String query,
            @RequestParam(required = false) String season,
            @RequestParam(required = false, name = "division_id") Long divisionId,
            @RequestParam(required = false) String format,
            @RequestParam(required = false) String gender) throws JsonProcessingException {
        List<LegacyTeamSearchResult> results = teams.search(filteredQuery(query, season, divisionId, format, gender)).stream()
                .map(this::response)
                .toList();
        return ResponseEntity.ok(json.write(results));
    }

    @GetMapping("/pools")
    public ResponseEntity<String> searchPools(
            @RequestParam String query,
            @RequestParam(required = false) String season,
            @RequestParam(required = false, name = "division_id") Long divisionId,
            @RequestParam(required = false) String format,
            @RequestParam(required = false) String gender) throws JsonProcessingException {
        List<LegacyPoolSearchResult> results = pools.search(filteredQuery(query, season, divisionId, format, gender)).stream()
                .map(this::response)
                .toList();
        return ResponseEntity.ok(json.write(results));
    }

    private FilteredSearchQuery filteredQuery(
            String query, String season, Long divisionId, String format, String gender) {
        return new FilteredSearchQuery(
                new SearchQuery(query),
                new SearchFilters(season, divisionId, format, gender));
    }

    private LegacyClubSearchResult response(ClubSearchView view) {
        return new LegacyClubSearchResult(view.id(), view.name(), view.logoUrl(), view.city());
    }

    private LegacyTeamSearchResult response(TeamSearchView view) {
        return new LegacyTeamSearchResult(
                view.id(), view.name(), view.shortName(), view.clubId(), view.clubName(), view.clubCity(),
                view.logoUrl(), view.divisionName(), view.format(), view.gender(), view.season());
    }

    private LegacyPoolSearchResult response(PoolSearchView view) {
        return new LegacyPoolSearchResult(
                view.id(), view.name(), view.shortName(), view.divisionName(), view.leagueCode(),
                view.leagueName(), view.season(), view.format(), view.gender(), view.logoUrl());
    }

    record LegacyClubSearchResult(String id, String name, String logoUrl, String city) {
    }

    record LegacyTeamSearchResult(
            Long id,
            String name,
            String shortName,
            String clubId,
            String clubName,
            String clubCity,
            String logoUrl,
            String divisionName,
            String format,
            String gender,
            String season) {
    }

    record LegacyPoolSearchResult(
            Long id,
            String name,
            String shortName,
            String divisionName,
            String leagueCode,
            String leagueName,
            String season,
            String format,
            String gender,
            String logoUrl) {
    }
}
