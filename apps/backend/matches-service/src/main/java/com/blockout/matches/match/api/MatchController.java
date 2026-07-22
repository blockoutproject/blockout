package com.blockout.matches.match.api;

import com.blockout.matches.match.api.mappers.MatchApiMapper;
import com.blockout.matches.match.api.models.*;
import com.blockout.matches.match.application.MatchService;
import com.blockout.matches.match.application.views.MatchView;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.MatchStatusEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.Collections;
import java.util.List;

/** Implements the generated V1 internal Match API. */
@RestController
@RequiredArgsConstructor
public class MatchController implements MatchApi {

    private final MatchService matchService;
    private final MatchApiMapper mapper;

    @Override
    public ResponseEntity<List<MatchInternalResponse>> listMatches(
        Long poolId,
        List<Long> teamIds,
        MatchStatusEnum status,
        Boolean active) {
        return ResponseEntity.ok(matchService.findMatches(poolId, teamIds, mapper.toApplication(status), active).stream()
            .map(mapper::toInternalResponse)
            .toList());
    }

    @Override
    public ResponseEntity<DayPageInternalResponse> getMatchDayGroups(
        Integer page,
        Integer size,
        List<Long> poolIds,
        List<Long> teamIds,
        MatchStatusEnum status,
        Boolean active) {
        return ResponseEntity.ok(mapper.toInternalResponse(matchService.getMatchesByDay(
            poolIds == null ? Collections.emptyList() : poolIds,
            teamIds == null ? Collections.emptyList() : teamIds,
            mapper.toApplication(status), page, size, active)));
    }

    @Override
    public ResponseEntity<MatchInternalResponse> getMatchById(Long id) {
        return ResponseEntity.ok(mapper.toInternalResponse(matchService.getMatchById(id)));
    }

    @PreAuthorize("hasAuthority('SCOPE_create:matches')")
    @Override
    public ResponseEntity<MatchInternalResponse> createMatch(CreateMatchInternalRequest request) {
        MatchView created = matchService.createMatch(mapper.toCommand(request));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(mapper.toInternalResponse(created));
    }

    @PreAuthorize("hasAuthority('SCOPE_update:matches')")
    @Override
    public ResponseEntity<MatchInternalResponse> updateMatch(
        Long id, UpdateMatchInternalRequest request) {
        return ResponseEntity.ok(mapper.toInternalResponse(matchService.updateMatch(id, mapper.toCommand(request))));
    }

    @PreAuthorize("hasAuthority('SCOPE_delete:matches')")
    @Override
    public ResponseEntity<Void> bulkDeactivateMatches(
        Long poolId, BulkMatchesDeactivateInternalRequest request) {
        matchService.bulkDeactivateMatches(poolId, request.getMissingMatchCodes());
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @Override
    public ResponseEntity<List<MatchLiveSummaryInternalResponse>> listMatchesForLiveModeration(
        LiveLinkStatusEnum status) {
        return ResponseEntity.ok(matchService.listMatchesForLiveModeration(mapper.toApplication(status)).stream()
            .map(mapper::toInternalResponse)
            .toList());
    }
}
