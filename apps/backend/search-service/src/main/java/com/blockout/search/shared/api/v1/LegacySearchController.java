package com.blockout.search.shared.api.v1;

import com.blockout.search.club.application.ClubSearchResult;
import com.blockout.search.club.application.ClubSearchService;
import com.blockout.search.pool.application.PoolSearchResult;
import com.blockout.search.pool.application.PoolSearchService;
import com.blockout.search.shared.application.SearchFilters;
import com.blockout.search.team.application.TeamSearchResult;
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
        List<LegacyClubSearchResult> results = clubs.search(query).stream().map(this::response).toList();
        return ResponseEntity.ok(json.write(results));
    }

    @GetMapping("/teams")
    public ResponseEntity<String> searchTeams(
            @RequestParam String query,
            @RequestParam(required = false) String season,
            @RequestParam(required = false, name = "division_id") Long divisionId,
            @RequestParam(required = false) String format,
            @RequestParam(required = false) String gender) throws JsonProcessingException {
        List<LegacyTeamSearchResult> results = teams.search(filters(query, season, divisionId, format, gender)).stream()
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
        List<LegacyPoolSearchResult> results = pools.search(filters(query, season, divisionId, format, gender)).stream()
                .map(this::response)
                .toList();
        return ResponseEntity.ok(json.write(results));
    }

    private SearchFilters filters(String query, String season, Long divisionId, String format, String gender) {
        return new SearchFilters(query, season, divisionId, format, gender);
    }

    private LegacyClubSearchResult response(ClubSearchResult result) {
        return new LegacyClubSearchResult(result.id(), result.name(), result.logoUrl(), result.city());
    }

    private LegacyTeamSearchResult response(TeamSearchResult result) {
        return new LegacyTeamSearchResult(
                result.id(), result.name(), result.shortName(), result.clubId(), result.clubName(), result.clubCity(),
                result.logoUrl(), result.divisionName(), result.format(), result.gender(), result.season());
    }

    private LegacyPoolSearchResult response(PoolSearchResult result) {
        return new LegacyPoolSearchResult(
                result.id(), result.name(), result.shortName(), result.divisionName(), result.leagueCode(),
                result.leagueName(), result.season(), result.format(), result.gender(), result.logoUrl());
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
