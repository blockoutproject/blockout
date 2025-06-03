package com.blockout.matches.controllers.v1;

import com.blockout.matches.models.Match;
import com.blockout.matches.models.MatchStatus;
import com.blockout.matches.models.dto.BulkMatchesDeactivateRequest;
import com.blockout.matches.models.dto.DayPageDTO;
import com.blockout.matches.services.MatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/matches")
public class MatchController {

    private final MatchService matchService;

    @Operation(summary = "Create match")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Match created"),
            @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    @PostMapping
    public ResponseEntity<Match> createMatch(@RequestBody Match match) {
        Match created = matchService.createMatch(match);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @Operation(summary = "List matches", description = """
            Returns matches with optional filters:
            poolId, teamIds, status, active.
            """)
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Matches returned"),
            @ApiResponse(responseCode = "204", description = "No match found")
    })
    @GetMapping
    public ResponseEntity<List<Match>> listMatches(
            @RequestParam(required = false, name = "pool_id") Long poolId,
            @RequestParam(required = false, name = "team_ids") List<Long> teamIds,
            @RequestParam(required = false) MatchStatus status,
            @RequestParam(required = false) Boolean active) {

        List<Match> matches = matchService.findMatches(poolId, teamIds, status, active);
        return ResponseEntity.ok(matches);
    }

    @Operation(summary = "Paginated day groups")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Day groups returned"),
    })
    @GetMapping("/day-groups")
    public ResponseEntity<DayPageDTO> dayGroups(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "3") int size,
            @RequestParam(required = false, name = "pool_ids") List<Long> poolIds,
            @RequestParam(required = false, name = "team_ids") List<Long> teamIds,
            @RequestParam(required = false) MatchStatus status) {

        DayPageDTO dto = matchService.getMatchesByDay(
                poolIds == null ? Collections.emptyList() : poolIds,
                teamIds == null ? Collections.emptyList() : teamIds,
                status,
                page,
                size);

        return ResponseEntity.ok(dto);
    }

    @Operation(summary = "Get match by ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Match found"),
            @ApiResponse(responseCode = "404", description = "Match not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<Match> getMatchById(@PathVariable Long id) {
        return matchService.getMatchById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Update match")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Match updated"),
            @ApiResponse(responseCode = "404", description = "Match not found")
    })
    @PutMapping("/{id}")
    public ResponseEntity<Match> updateMatch(
            @PathVariable Long id,
            @RequestBody Match updated) {

        Optional<Match> result = matchService.updateMatch(id, updated);
        return result.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Bulk deactivate matches in a pool")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Matches deactivated")
    })
    @PutMapping("/pools/{poolId}/bulk-deactivate")
    public ResponseEntity<Void> bulkDeactivateMatches(
            @PathVariable Long poolId,
            @RequestBody BulkMatchesDeactivateRequest request) {

        matchService.bulkDeactivateMatches(poolId, request.getMissingMatchCodes());
        return ResponseEntity.ok().build();
    }
}