package com.blockout.mobilegateway.controllers.v1.secureapi;

import com.blockout.mobilegateway.models.dto.match.EnrichedMatchLiveSummaryDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveLinkDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveLinkReportRequestDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveLinkRequestDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveLinkResponseDTO;
import com.blockout.mobilegateway.services.MatchService;
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

    private final MatchService matchService;

    @PostMapping(path = "/{matchId}/live-link")
    public ResponseEntity<MatchLiveLinkResponseDTO> upsertLiveLink(
            @PathVariable Long matchId,
            @RequestBody MatchLiveLinkRequestDTO request,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        MatchLiveLinkResponseDTO dto = matchService.upsertLiveLink(matchId, request, auth0Id);
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
            @RequestBody MatchLiveLinkReportRequestDTO request,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        matchService.reportLiveLink(matchId, request, auth0Id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{matchId}/live-links")
    public ResponseEntity<List<MatchLiveLinkDTO>> getLiveLinksHistory(
            @PathVariable Long matchId,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        List<MatchLiveLinkDTO> dtos = matchService.getLiveLinksHistory(matchId, auth0Id);
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/live-moderation")
    public ResponseEntity<List<EnrichedMatchLiveSummaryDTO>> listMatchesForLiveModeration() {
        List<EnrichedMatchLiveSummaryDTO> dtos = matchService.listMatchesForLiveModeration();
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
}