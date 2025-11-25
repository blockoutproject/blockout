package com.blockout.mobilegateway.controllers.v1.secureapi;

import com.blockout.mobilegateway.models.dto.match.MatchLiveLinkReportRequestDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveLinkRequestDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveLinkResponseDTO;
import com.blockout.mobilegateway.services.MatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/secure/matches")
public class MatchSecureController {

    private final MatchService matchLiveLinkService;

    @Operation(summary = "Créer ou mettre à jour le lien live d'un match")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lien live créé/mis à jour"),
            @ApiResponse(responseCode = "400", description = "Requête invalide"),
            @ApiResponse(responseCode = "404", description = "Match introuvable")
    })
    @PostMapping(path = "/{matchId}/live-link")
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
    @DeleteMapping(path = "/{matchId}/live-link")
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
    @PostMapping("/{matchId}/live-link/report")
    public ResponseEntity<Void> reportLiveLink(
            @PathVariable Long matchId,
            @RequestBody MatchLiveLinkReportRequestDTO request,
            @AuthenticationPrincipal Jwt jwt) {

        String auth0Id = jwt.getSubject();
        matchLiveLinkService.reportLiveLink(matchId, request, auth0Id);
        return ResponseEntity.noContent().build();
    }
}