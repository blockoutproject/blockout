package com.blockout.matches.match.api;

import com.blockout.matches.match.api.models.MatchFinishedTestRequest;
import com.blockout.matches.match.application.MatchService;
import com.blockout.matches.match.application.ports.MatchEventPublisher;
import com.blockout.matches.match.application.views.MatchView;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/matches/internal/test")
public class MatchTestController {

    private final MatchService matchService;
    private final MatchEventPublisher eventPublisher;

    @PreAuthorize("hasAuthority('SCOPE_publish:events')")
    @PostMapping("/{id}/emit-finished")
    public ResponseEntity<Void> emitFinishedById(@PathVariable Long id) {
        eventPublisher.publishMatchFinished(matchService.getMatchById(id));
        return ResponseEntity.accepted().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_publish:events')")
    @PostMapping("/emit-finished")
    public ResponseEntity<Void> emitFinishedCustom(@RequestBody MatchFinishedTestRequest request) {
        eventPublisher.publishMatchFinished(new MatchView(
                request.id(), null, null, request.poolId(), null, request.teamIdA(), request.teamIdB(), null,
                null, request.set(), null, null, null, null, null, null, null, null, null, null, null));
        return ResponseEntity.accepted().build();
    }
}
