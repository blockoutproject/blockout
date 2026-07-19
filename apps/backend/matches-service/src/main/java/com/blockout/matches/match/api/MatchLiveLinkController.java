package com.blockout.matches.match.api;

import com.blockout.matches.match.api.mappers.MatchApiMapper;
import com.blockout.matches.match.api.models.MatchLiveLinkInternalResponse;
import com.blockout.matches.match.api.models.MatchLiveLinkResultInternalResponse;
import com.blockout.matches.match.api.models.ReportMatchLiveLinkInternalRequest;
import com.blockout.matches.match.api.models.SetMatchLiveLinkInternalRequest;
import com.blockout.matches.match.application.MatchLiveLinkReportService;
import com.blockout.matches.match.application.MatchLiveLinkService;
import com.blockout.matches.match.application.commands.SetMatchLiveLinkCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/matches")
public class MatchLiveLinkController {

    private final MatchLiveLinkService liveLinkService;
    private final MatchLiveLinkReportService reportService;
    private final MatchApiMapper mapper;

    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @GetMapping("/{matchId}/live-links")
    public ResponseEntity<List<MatchLiveLinkInternalResponse>> getLiveLinksHistory(@PathVariable Long matchId) {
        return ResponseEntity.ok(liveLinkService.getLiveLinksHistoryForMatch(matchId).stream()
                .map(mapper::toInternalResponse)
                .toList());
    }

    @PreAuthorize("hasAuthority('SCOPE_create:match_live_link')")
    @PostMapping("/{matchId}/live-link")
    public ResponseEntity<MatchLiveLinkResultInternalResponse> upsertLiveLink(
            @PathVariable Long matchId, @RequestBody SetMatchLiveLinkInternalRequest request) {
        return ResponseEntity.ok(mapper.toInternalResponse(
                liveLinkService.upsertLiveLink(matchId, new SetMatchLiveLinkCommand(request.url()))));
    }

    @PreAuthorize("hasAuthority('SCOPE_delete:match_live_link')")
    @DeleteMapping("/{matchId}/live-link")
    public ResponseEntity<Void> deleteLiveLink(
            @PathVariable Long matchId, @AuthenticationPrincipal Jwt jwt) {
        liveLinkService.deleteLiveLink(matchId, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_report:match_live_link')")
    @PostMapping("/{matchId}/live-link/report")
    public ResponseEntity<Void> reportLiveLink(
            @PathVariable Long matchId,
            @RequestBody ReportMatchLiveLinkInternalRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        reportService.reportLiveLink(matchId, request.reason(), jwt.getSubject());
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @PostMapping("/live-links/{liveLinkId}/approve")
    public ResponseEntity<Void> approvePendingLink(@PathVariable Long liveLinkId) {
        liveLinkService.approvePendingLink(liveLinkId);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @PostMapping("/live-links/{liveLinkId}/reject")
    public ResponseEntity<Void> rejectPendingLink(@PathVariable Long liveLinkId) {
        liveLinkService.rejectPendingLink(liveLinkId);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @PostMapping("/live-links/{liveLinkId}/reactivate")
    public ResponseEntity<Void> reactivateLiveLink(@PathVariable Long liveLinkId) {
        liveLinkService.reactivateLiveLink(liveLinkId);
        return ResponseEntity.noContent().build();
    }
}
