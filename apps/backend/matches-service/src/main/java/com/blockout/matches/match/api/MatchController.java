package com.blockout.matches.match.api;

import com.blockout.matches.match.api.mappers.MatchApiMapper;
import com.blockout.matches.match.api.models.BulkMatchesDeactivateInternalRequest;
import com.blockout.matches.match.api.models.CreateMatchInternalRequest;
import com.blockout.matches.match.api.models.DayPageInternalResponse;
import com.blockout.matches.match.api.models.MatchInternalResponse;
import com.blockout.matches.match.api.models.MatchLiveSummaryInternalResponse;
import com.blockout.matches.match.api.models.UpdateMatchInternalRequest;
import com.blockout.matches.match.application.MatchService;
import com.blockout.matches.match.application.models.LiveLinkStatus;
import com.blockout.matches.match.application.models.MatchStatus;
import com.blockout.matches.match.application.views.MatchView;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.Collections;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/matches")
public class MatchController {

    private final MatchService matchService;
    private final MatchApiMapper mapper;

    @GetMapping
    public ResponseEntity<List<MatchInternalResponse>> listMatches(
            @RequestParam(required = false) Long poolId,
            @RequestParam(required = false) List<Long> teamIds,
            @RequestParam(required = false) MatchStatus status,
            @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(matchService.findMatches(poolId, teamIds, status, active).stream()
                .map(mapper::toInternalResponse)
                .toList());
    }

    @GetMapping("/day-groups")
    public ResponseEntity<DayPageInternalResponse> dayGroups(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "4") int size,
            @RequestParam(required = false) List<Long> poolIds,
            @RequestParam(required = false) List<Long> teamIds,
            @RequestParam(required = false) MatchStatus status,
            @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(mapper.toInternalResponse(matchService.getMatchesByDay(
                poolIds == null ? Collections.emptyList() : poolIds,
                teamIds == null ? Collections.emptyList() : teamIds,
                status, page, size, active)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MatchInternalResponse> getMatchById(@PathVariable Long id) {
        return ResponseEntity.ok(mapper.toInternalResponse(matchService.getMatchById(id)));
    }

    @PreAuthorize("hasAuthority('SCOPE_create:matches')")
    @PostMapping
    public ResponseEntity<MatchInternalResponse> createMatch(@RequestBody CreateMatchInternalRequest request) {
        MatchView created = matchService.createMatch(mapper.toCommand(request));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(mapper.toInternalResponse(created));
    }

    @PreAuthorize("hasAuthority('SCOPE_update:matches')")
    @PutMapping("/{id}")
    public ResponseEntity<MatchInternalResponse> updateMatch(
            @PathVariable Long id, @RequestBody UpdateMatchInternalRequest request) {
        return ResponseEntity.ok(mapper.toInternalResponse(matchService.updateMatch(id, mapper.toCommand(request))));
    }

    @PreAuthorize("hasAuthority('SCOPE_delete:matches')")
    @PutMapping("/pools/{poolId}/bulk-deactivate")
    public ResponseEntity<Void> bulkDeactivateMatches(
            @PathVariable Long poolId, @RequestBody BulkMatchesDeactivateInternalRequest request) {
        matchService.bulkDeactivateMatches(poolId, request.missingMatchCodes());
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @GetMapping("/live-moderation")
    public ResponseEntity<List<MatchLiveSummaryInternalResponse>> listMatchesForLiveModeration(
            @RequestParam(value = "status", required = false) LiveLinkStatus statusFilter) {
        return ResponseEntity.ok(matchService.listMatchesForLiveModeration(statusFilter).stream()
                .map(mapper::toInternalResponse)
                .toList());
    }
}
