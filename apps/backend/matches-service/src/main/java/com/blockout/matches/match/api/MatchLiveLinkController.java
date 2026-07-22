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
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Implements the generated V1 internal Match live-link API. */
@RestController
@RequiredArgsConstructor
public class MatchLiveLinkController implements MatchLiveLinkApi {

    private final MatchLiveLinkService liveLinkService;
    private final MatchLiveLinkReportService reportService;
    private final MatchApiMapper mapper;

    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @Override
    public ResponseEntity<List<MatchLiveLinkInternalResponse>> getLiveLinksHistory(Long matchId) {
        return ResponseEntity.ok(liveLinkService.getLiveLinksHistoryForMatch(matchId).stream()
            .map(mapper::toInternalResponse)
            .toList());
    }

    @PreAuthorize("hasAuthority('SCOPE_create:match_live_link')")
    @Override
    public ResponseEntity<MatchLiveLinkResultInternalResponse> upsertLiveLink(
        Long matchId, SetMatchLiveLinkInternalRequest request) {
        return ResponseEntity.ok(mapper.toInternalResponse(
            liveLinkService.upsertLiveLink(matchId, new SetMatchLiveLinkCommand(request.getUrl()))));
    }

    @PreAuthorize("hasAuthority('SCOPE_delete:match_live_link')")
    @Override
    public ResponseEntity<Void> deleteLiveLink(Long matchId) {
        liveLinkService.deleteLiveLink(matchId, currentSubject());
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_report:match_live_link')")
    @Override
    public ResponseEntity<Void> reportLiveLink(
        Long matchId,
        ReportMatchLiveLinkInternalRequest request) {
        reportService.reportLiveLink(matchId, request.getReason(), currentSubject());
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @Override
    public ResponseEntity<Void> approvePendingLink(Long liveLinkId) {
        liveLinkService.approvePendingLink(liveLinkId);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @Override
    public ResponseEntity<Void> rejectPendingLink(Long liveLinkId) {
        liveLinkService.rejectPendingLink(liveLinkId);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @Override
    public ResponseEntity<Void> reactivateLiveLink(Long liveLinkId) {
        liveLinkService.reactivateLiveLink(liveLinkId);
        return ResponseEntity.noContent().build();
    }

    private String currentSubject() {
        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return jwt.getSubject();
    }
}
