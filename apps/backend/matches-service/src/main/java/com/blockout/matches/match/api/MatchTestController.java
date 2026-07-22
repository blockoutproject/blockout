package com.blockout.matches.match.api;

import com.blockout.matches.match.api.models.MatchFinishedTestRequest;
import com.blockout.matches.match.application.MatchService;
import com.blockout.matches.match.application.ports.MatchEventPublisher;
import com.blockout.matches.match.application.views.MatchView;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

/** Implements the generated internal Match event test API. */
@RestController
@RequiredArgsConstructor
public class MatchTestController implements MatchTestApi {

    private final MatchService matchService;
    private final MatchEventPublisher eventPublisher;

    @PreAuthorize("hasAuthority('SCOPE_publish:events')")
    @Override
    public ResponseEntity<Void> emitFinishedById(Long id) {
        eventPublisher.publishMatchFinished(matchService.getMatchById(id));
        return ResponseEntity.accepted().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_publish:events')")
    @Override
    public ResponseEntity<Void> emitFinishedCustom(MatchFinishedTestRequest request) {
        eventPublisher.publishMatchFinished(new MatchView(
            request.getId(), null, null, request.getPoolId(), null, request.getTeamIdA(), request.getTeamIdB(), null,
            null, request.getSet(), null, null, null, null, null, null, null, null, null, null, null));
        return ResponseEntity.accepted().build();
    }
}
