package com.blockout.matches.controllers.v1;

import com.blockout.matches.models.Match;
import com.blockout.matches.models.MatchStatus;
import com.blockout.matches.models.dto.BulkMatchesDeactivateRequest;
import com.blockout.matches.models.dto.DayPageDTO;
import com.blockout.matches.services.MatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/")
public class MatchController {

    private final MatchService matchService;

    public MatchController(MatchService matchService) {
        this.matchService = matchService;
    }

    @Operation(summary = "Create match")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Match created"),
            @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    @PostMapping("/matches")
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
    @GetMapping("/matches")
    public ResponseEntity<List<Match>> listMatches(
            @RequestParam(required = false) Long poolId,
            @RequestParam(required = false) List<Long> teamIds,
            @RequestParam(required = false) MatchStatus status,
            @RequestParam(required = false) Boolean active) {

        List<Match> matches = matchService.findMatches(poolId, teamIds, status, active);

        if (matches.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(matches);
    }

    @Operation(summary = "Paginated day groups")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Day groups returned"),
            @ApiResponse(responseCode = "204", description = "No match found")
    })
    @GetMapping("/matches/day-groups")
    public ResponseEntity<DayPageDTO> dayGroups(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "3") int size,
            @RequestParam(required = false) List<Long> poolIds,
            @RequestParam(required = false) List<Long> teamIds,
            @RequestParam(required = false) MatchStatus status) {

        DayPageDTO dto = matchService.getMatchesByDay(
                poolIds == null ? Collections.emptyList() : poolIds,
                teamIds == null ? Collections.emptyList() : teamIds,
                status,
                page,
                size);

        if (dto.getDayMatches().isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(dto);
    }

    @Operation(summary = "Get match by ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Match found"),
            @ApiResponse(responseCode = "404", description = "Match not found")
    })
    @GetMapping("/matches/{id}")
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
    @PutMapping("/matches/{id}")
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
    @PutMapping("/pools/{poolId}/matches/bulk-deactivate")
    public ResponseEntity<Void> bulkDeactivateMatches(
            @PathVariable Long poolId,
            @RequestBody BulkMatchesDeactivateRequest request) {

        matchService.bulkDeactivateMatches(poolId, request.getMissingMatchCodes());
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Started matches", description = "Returns upcoming matches that have already started.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Matches returned"),
            @ApiResponse(responseCode = "204", description = "No match found")
    })
    @GetMapping("/matches/started")
    public ResponseEntity<List<Match>> startedMatches(
            @RequestParam MatchStatus status,
            @RequestParam boolean active,
            @RequestParam LocalDateTime currentTime) {

        List<Match> started = matchService.getStartedMatches(status, active, currentTime);

        if (started.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(started);
    }

    @Operation(summary = "Get match by composite keys")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Match found"),
            @ApiResponse(responseCode = "404", description = "Match not found")
    })
    @GetMapping("/pools/{poolId}/matches/search")
    public ResponseEntity<Match> getMatchByPoolTeamsDate(
            @PathVariable Long poolId,
            @RequestParam Long teamIdA,
            @RequestParam Long teamIdB,
            @RequestParam LocalDate matchDate) {

        Optional<Match> match = matchService.getMatchByPoolAndTeamsAndDate(poolId, teamIdA, teamIdB, matchDate);
        return match.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }
}