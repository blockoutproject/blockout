package com.blockout.matches.controllers.v1;

import com.blockout.matches.match.live.application.MatchLiveLinkApplicationService;
import com.blockout.matches.match.live.application.MatchLiveLinkHistoryItemView;
import com.blockout.matches.match.live.application.MatchLiveLinkResultView;
import com.blockout.matches.match.live.application.UpsertMatchLiveLinkCommand;
import com.blockout.matches.match.live.moderation.application.MatchLiveLinkDecision;
import com.blockout.matches.match.live.moderation.application.MatchLiveModerationApplicationService;
import com.blockout.matches.match.live.moderation.application.ModerateMatchLiveLinkCommand;
import com.blockout.matches.match.live.report.application.MatchLiveLinkReportApplicationService;
import com.blockout.matches.match.live.report.application.ReportMatchLiveLinkCommand;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.LiveProvider;
import com.blockout.matches.shared.api.v1.LegacyMatchesJson;
import com.fasterxml.jackson.core.JsonProcessingException;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/matches")
public class MatchLiveLinkController {

    private final MatchLiveLinkApplicationService liveLinks;
    private final MatchLiveModerationApplicationService moderation;
    private final MatchLiveLinkReportApplicationService reports;
    private final LegacyMatchesJson json;

    @Operation(summary = "Lister l'historique complet des liens live d'un match")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Historique des liens renvoyé"),
            @ApiResponse(responseCode = "403", description = "Non autorisé")
    })
    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @GetMapping(value = "/{matchId}/live-links", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getLiveLinksHistory(@PathVariable Long matchId) throws JsonProcessingException {
        List<LegacyLiveLinkHistoryResponse> response = liveLinks.findAllHistory(matchId).stream()
                .map(this::legacyResponse)
                .toList();
        return ResponseEntity.ok(json.write(response));
    }

    @Operation(summary = "Créer ou mettre à jour le lien live d'un match")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lien live créé/mis à jour"),
            @ApiResponse(responseCode = "400", description = "Requête invalide"),
            @ApiResponse(responseCode = "404", description = "Match introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_create:match_live_link')")
    @PostMapping(
            value = "/{matchId}/live-link",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> upsertLiveLink(@PathVariable Long matchId, @RequestBody String body)
            throws JsonProcessingException {
        LegacyLiveLinkRequest request = json.read(body, LegacyLiveLinkRequest.class);
        return ResponseEntity.ok(json.write(legacyResponse(
                liveLinks.upsert(matchId, new UpsertMatchLiveLinkCommand(request.url())))));
    }

    @Operation(summary = "Supprimer le lien live actif d'un match")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Lien supprimé ou inexistant"),
            @ApiResponse(responseCode = "403", description = "Non autorisé")
    })
    @PreAuthorize("hasAuthority('SCOPE_delete:match_live_link')")
    @DeleteMapping("/{matchId}/live-link")
    public ResponseEntity<Void> deleteLiveLink(
            @PathVariable Long matchId,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        liveLinks.delete(matchId, auth0Id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Signaler un lien live comme incorrect ou inapproprié")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Signalement enregistré"),
            @ApiResponse(responseCode = "404", description = "Aucun lien live actif pour ce match")
    })
    @PreAuthorize("hasAuthority('SCOPE_report:match_live_link')")
    @PostMapping("/{matchId}/live-link/report")
    public ResponseEntity<Void> reportLiveLink(
            @PathVariable Long matchId,
            @RequestBody String body,
            @AuthenticationPrincipal Jwt jwt) throws JsonProcessingException {

        LegacyLiveLinkReportRequest request = json.read(body, LegacyLiveLinkReportRequest.class);
        reports.report(matchId, new ReportMatchLiveLinkCommand(request.reason(), jwt.getSubject()));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Approuver un lien en attente (PENDING → ACTIVE)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Lien approuvé"),
            @ApiResponse(responseCode = "400", description = "Lien non pending"),
            @ApiResponse(responseCode = "403", description = "Non autorisé"),
            @ApiResponse(responseCode = "404", description = "Lien ou match introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @PostMapping("/live-links/{liveLinkId}/approve")
    public ResponseEntity<Void> approvePendingLink(@PathVariable Long liveLinkId) {
        moderation.moderate(new ModerateMatchLiveLinkCommand(liveLinkId, MatchLiveLinkDecision.APPROVE));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Refuser un lien en attente (PENDING → REJECTED)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Lien refusé"),
            @ApiResponse(responseCode = "400", description = "Lien non pending"),
            @ApiResponse(responseCode = "403", description = "Non autorisé"),
            @ApiResponse(responseCode = "404", description = "Lien introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @PostMapping("/live-links/{liveLinkId}/reject")
    public ResponseEntity<Void> rejectPendingLink(@PathVariable Long liveLinkId) {
        moderation.moderate(new ModerateMatchLiveLinkCommand(liveLinkId, MatchLiveLinkDecision.REJECT));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Réactiver un lien rejeté / expiré / supprimé (→ ACTIVE)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Lien réactivé"),
            @ApiResponse(responseCode = "400", description = "Lien dans un état non réactivable"),
            @ApiResponse(responseCode = "403", description = "Non autorisé"),
            @ApiResponse(responseCode = "404", description = "Lien ou match introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @PostMapping("/live-links/{liveLinkId}/reactivate")
    public ResponseEntity<Void> reactivateLiveLink(@PathVariable Long liveLinkId) {
        moderation.moderate(new ModerateMatchLiveLinkCommand(liveLinkId, MatchLiveLinkDecision.REACTIVATE));
        return ResponseEntity.noContent().build();
    }

    private LegacyLiveLinkResultResponse legacyResponse(MatchLiveLinkResultView view) {
        return new LegacyLiveLinkResultResponse(view.matchId(), LiveProvider.valueOf(view.provider().getValue()),
                view.url(), LiveLinkStatus.valueOf(view.status().getValue()), view.reportCount(), view.ownerAuth0Id());
    }

    private LegacyLiveLinkHistoryResponse legacyResponse(MatchLiveLinkHistoryItemView view) {
        return new LegacyLiveLinkHistoryResponse(view.id(), view.matchId(),
                LiveProvider.valueOf(view.provider().getValue()), view.url(),
                LiveLinkStatus.valueOf(view.status().getValue()), view.reportCount(), view.ownerAuth0Id(),
                view.createdAt(), view.lastUpdate());
    }

    record LegacyLiveLinkRequest(String url) {
    }

    record LegacyLiveLinkReportRequest(String reason) {
    }

    record LegacyLiveLinkResultResponse(
            Long matchId,
            LiveProvider provider,
            String url,
            LiveLinkStatus status,
            int reportCount,
            String ownerAuth0Id) {
    }

    record LegacyLiveLinkHistoryResponse(
            Long id,
            Long matchId,
            LiveProvider provider,
            String url,
            LiveLinkStatus status,
            int reportCount,
            String ownerAuth0Id,
            Instant createdAt,
            Instant lastUpdate) {
    }
}
