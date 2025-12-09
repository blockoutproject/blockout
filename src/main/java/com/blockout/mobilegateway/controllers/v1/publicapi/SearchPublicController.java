package com.blockout.mobilegateway.controllers.v1.publicapi;

import com.blockout.mobilegateway.models.dto.search.ClubSearchDocDTO;
import com.blockout.mobilegateway.models.dto.search.PoolSearchDocDTO;
import com.blockout.mobilegateway.models.dto.search.TeamSearchDocDTO;
import com.blockout.mobilegateway.services.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/public/search")
public class SearchPublicController {

    private final SearchService searchService;

    @GetMapping("/clubs")
    public ResponseEntity<List<ClubSearchDocDTO>> searchClubs(
            @RequestParam String query) {
        List<ClubSearchDocDTO> results = searchService.searchClubs(query);
        return results.isEmpty() ? ResponseEntity.noContent().build() : ResponseEntity.ok(results);
    }

    @GetMapping("/pools")
    public ResponseEntity<List<PoolSearchDocDTO>> searchPools(
            @RequestParam String query,
            @RequestParam(required = false) String season,
            @RequestParam(required = false, name = "division_id") Long divisionId) {
        List<PoolSearchDocDTO> results = searchService.searchPools(query, season, divisionId);
        return results.isEmpty()
                ? ResponseEntity.noContent().build()
                : ResponseEntity.ok(results);
    }

    @GetMapping("/teams")
    public ResponseEntity<List<TeamSearchDocDTO>> searchTeams(
            @RequestParam String query,
            @RequestParam(required = false) String season,
            @RequestParam(required = false, name = "division_id") Long divisionId) {
        List<TeamSearchDocDTO> results = searchService.searchTeams(query, season, divisionId);
        return results.isEmpty()
                ? ResponseEntity.noContent().build()
                : ResponseEntity.ok(results);
    }
}