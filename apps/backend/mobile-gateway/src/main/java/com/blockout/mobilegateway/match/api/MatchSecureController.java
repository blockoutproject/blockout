package com.blockout.mobilegateway.match.api;

import com.blockout.mobilegateway.match.api.models.MatchLiveSummaryResponse;
import com.blockout.mobilegateway.match.api.models.MatchLiveLinkInternalResponse;
import com.blockout.mobilegateway.match.api.models.ReportMatchLiveLinkRequest;
import com.blockout.mobilegateway.match.api.models.UpsertMatchLiveLinkRequest;
import com.blockout.mobilegateway.match.api.models.UpsertMatchLiveLinkResponse;
import com.blockout.mobilegateway.shared.application.models.LiveLinkStatus;
import com.blockout.mobilegateway.match.application.MatchApplicationService;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/secure/matches")
public class MatchSecureController {

    private final MatchApplicationService matchService;

    @PostMapping(path = "/{matchId}/live-link")
    public ResponseEntity<UpsertMatchLiveLinkResponse> upsertLiveLink(
            @PathVariable Long matchId,
            @RequestBody UpsertMatchLiveLinkRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        UpsertMatchLiveLinkResponse dto = matchService.upsertLiveLink(matchId, request, auth0Id);
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping(path = "/{matchId}/live-link")
    public ResponseEntity<Void> deleteLiveLink(
            @PathVariable Long matchId,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        matchService.deleteLiveLink(matchId, auth0Id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{matchId}/live-link/report")
    public ResponseEntity<Void> reportLiveLink(
            @PathVariable Long matchId,
            @RequestBody ReportMatchLiveLinkRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        matchService.reportLiveLink(matchId, request, auth0Id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{matchId}/live-links")
    public ResponseEntity<List<MatchLiveLinkInternalResponse>> getLiveLinksHistory(
            @PathVariable Long matchId,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        List<MatchLiveLinkInternalResponse> dtos = matchService.getLiveLinksHistory(matchId, auth0Id);
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/live-moderation")
    public ResponseEntity<List<MatchLiveSummaryResponse>> listMatchesForLiveModeration(
            @RequestParam(value = "status", required = false) LiveLinkStatus statusFilter) {
        List<MatchLiveSummaryResponse> dtos = matchService.listMatchesForLiveModeration(statusFilter);
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/live-links/{liveLinkId}/approve")
    public ResponseEntity<Void> approvePendingLink(
            @PathVariable Long liveLinkId,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        matchService.approvePendingLiveLink(liveLinkId, auth0Id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/live-links/{liveLinkId}/reject")
    public ResponseEntity<Void> rejectPendingLink(
            @PathVariable Long liveLinkId,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        matchService.rejectPendingLiveLink(liveLinkId, auth0Id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/live-links/{liveLinkId}/reactivate")
    public ResponseEntity<Void> reactivateLiveLink(
            @PathVariable Long liveLinkId,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        matchService.reactivateLiveLink(liveLinkId, auth0Id);
        return ResponseEntity.noContent().build();
    }
}