package com.blockout.matches.controllers.v1;

import com.blockout.matches.models.dto.match.MatchLiveLinkDTO;
import com.blockout.matches.models.dto.match.MatchLiveLinkReportRequestDTO;
import com.blockout.matches.models.dto.match.MatchLiveLinkRequestDTO;
import com.blockout.matches.models.dto.match.MatchLiveLinkResponseDTO;
import com.blockout.matches.services.MatchLiveLinkReportService;
import com.blockout.matches.services.MatchLiveLinkService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/matches")
public class MatchLiveLinkController {

    private final MatchLiveLinkService matchLiveLinkService;
    private final MatchLiveLinkReportService matchLiveLinkReportService;

    @Operation(summary = "Lister l'historique complet des liens live d'un match")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Historique des liens renvoyé"),
            @ApiResponse(responseCode = "403", description = "Non autorisé")
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @GetMapping("/{matchId}/live-links")
    public ResponseEntity<List<MatchLiveLinkDTO>> getLiveLinksHistory(@PathVariable Long matchId) {
        List<MatchLiveLinkDTO> dtos = matchLiveLinkService.getLiveLinksHistoryForMatch(matchId);
        return ResponseEntity.ok(dtos);
    }

    @Operation(summary = "Créer ou mettre à jour le lien live d'un match")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lien live créé/mis à jour"),
            @ApiResponse(responseCode = "400", description = "Requête invalide"),
            @ApiResponse(responseCode = "404", description = "Match introuvable")
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_create:match_live_link')")
    @PostMapping("/{matchId}/live-link")
    public ResponseEntity<MatchLiveLinkResponseDTO> upsertLiveLink(
            @PathVariable Long matchId,
            @RequestBody MatchLiveLinkRequestDTO request) {

        MatchLiveLinkResponseDTO dto = matchLiveLinkService.upsertLiveLink(matchId, request);
        return ResponseEntity.ok(dto);
    }

    @Operation(summary = "Supprimer le lien live actif d'un match")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Lien supprimé ou inexistant"),
            @ApiResponse(responseCode = "403", description = "Non autorisé")
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_delete:match_live_link')")
    @DeleteMapping("/{matchId}/live-link")
    public ResponseEntity<Void> deleteLiveLink(
            @PathVariable Long matchId,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        matchLiveLinkService.deleteLiveLink(matchId, auth0Id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Signaler un lien live comme incorrect ou inapproprié")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Signalement enregistré"),
            @ApiResponse(responseCode = "404", description = "Aucun lien live actif pour ce match")
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_report:match_live_link')")
    @PostMapping("/{matchId}/live-link/report")
    public ResponseEntity<Void> reportLiveLink(
            @PathVariable Long matchId,
            @RequestBody MatchLiveLinkReportRequestDTO request,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        matchLiveLinkReportService.reportLiveLink(matchId, request, auth0Id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Approuver un lien en attente (PENDING → ACTIVE)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Lien approuvé"),
            @ApiResponse(responseCode = "400", description = "Lien non pending"),
            @ApiResponse(responseCode = "403", description = "Non autorisé"),
            @ApiResponse(responseCode = "404", description = "Lien ou match introuvable")
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @PostMapping("/live-links/{liveLinkId}/approve")
    public ResponseEntity<Void> approvePendingLink(@PathVariable Long liveLinkId) {
        matchLiveLinkService.approvePendingLink(liveLinkId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Refuser un lien en attente (PENDING → REJECTED)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Lien refusé"),
            @ApiResponse(responseCode = "400", description = "Lien non pending"),
            @ApiResponse(responseCode = "403", description = "Non autorisé"),
            @ApiResponse(responseCode = "404", description = "Lien introuvable")
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @PostMapping("/live-links/{liveLinkId}/reject")
    public ResponseEntity<Void> rejectPendingLink(@PathVariable Long liveLinkId) {
        matchLiveLinkService.rejectPendingLink(liveLinkId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Réactiver un lien rejeté / expiré / supprimé (→ ACTIVE)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Lien réactivé"),
            @ApiResponse(responseCode = "400", description = "Lien dans un état non réactivable"),
            @ApiResponse(responseCode = "403", description = "Non autorisé"),
            @ApiResponse(responseCode = "404", description = "Lien ou match introuvable")
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @PostMapping("/live-links/{liveLinkId}/reactivate")
    public ResponseEntity<Void> reactivateLiveLink(@PathVariable Long liveLinkId) {
        matchLiveLinkService.reactivateLiveLink(liveLinkId);
        return ResponseEntity.noContent().build();
    }
}