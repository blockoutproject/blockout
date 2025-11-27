package com.blockout.matches.controllers.v1;

import com.blockout.matches.models.dto.match.MatchDTO;
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

    @Operation(summary = "Récupérer le lien live d'un match")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lien live trouvé"),
            @ApiResponse(responseCode = "404", description = "Aucun lien live pour ce match")
    })
    @GetMapping("/{matchId}/live-link")
    public ResponseEntity<MatchLiveLinkResponseDTO> getLiveLink(@PathVariable Long matchId) {
        MatchLiveLinkResponseDTO dto = matchLiveLinkService.getActiveLiveLink(matchId);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(dto);
    }

    @Operation(summary = "Créer ou mettre à jour le lien live d'un match")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lien live créé/mis à jour"),
            @ApiResponse(responseCode = "400", description = "Requête invalide"),
            @ApiResponse(responseCode = "404", description = "Match introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_create:match_live_link')")
    @PostMapping("/{matchId}/live-link")
    public ResponseEntity<MatchLiveLinkResponseDTO> upsertLiveLink(
            @PathVariable Long matchId,
            @RequestBody MatchLiveLinkRequestDTO request,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        MatchLiveLinkResponseDTO dto = matchLiveLinkService.upsertLiveLink(matchId, request, auth0Id);
        return ResponseEntity.ok(dto);
    }

    @Operation(summary = "Supprimer le lien live d'un match")
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
        matchLiveLinkService.deleteLiveLink(matchId, auth0Id);
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
            @RequestBody MatchLiveLinkReportRequestDTO request,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        matchLiveLinkReportService.reportLiveLink(matchId, request, auth0Id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Lister tous les liens en attente de validation (PENDING)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Liste des liens en attente"),
            @ApiResponse(responseCode = "403", description = "Non autorisé")
    })
    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    @GetMapping("/live-links/pending")
    public ResponseEntity<List<MatchDTO>> listPendingLinks() {
        List<MatchDTO> dtos = matchLiveLinkService.listPendingLinks();
        return ResponseEntity.ok(dtos);
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
    public ResponseEntity<Void> approvePendingLink(
            @PathVariable Long liveLinkId,
            @AuthenticationPrincipal Jwt jwt) {

        String adminAuth0Id = jwt.getSubject();
        matchLiveLinkService.approvePendingLink(liveLinkId, adminAuth0Id);
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
    public ResponseEntity<Void> rejectPendingLink(
            @PathVariable Long liveLinkId,
            @AuthenticationPrincipal Jwt jwt) {

        String adminAuth0Id = jwt.getSubject();
        matchLiveLinkService.rejectPendingLink(liveLinkId, adminAuth0Id);
        return ResponseEntity.noContent().build();
    }
}