package com.blockout.users.controllers.v1;

import com.blockout.users.models.dto.RegisterPushTokenRequest;
import com.blockout.users.models.dto.ResolveTokensRequest;
import com.blockout.users.models.dto.ResolveTokensResponse;
import com.blockout.users.models.dto.DeactivatePushTokenRequest;
import com.blockout.users.services.PushTokenService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
public class PushTokenController {

    private final PushTokenService pushTokenService;

    @Operation(summary = "Enregistrer / mettre à jour un push token")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Token enregistré/actualisé"),
            @ApiResponse(responseCode = "404", description = "Utilisateur introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_update:current_user') or hasAuthority('SCOPE_update:users')")
    @PostMapping("/users/{userId}/push-tokens")
    public ResponseEntity<Void> register(
            @PathVariable Long userId,
            @Valid @RequestBody RegisterPushTokenRequest req) {
        pushTokenService.register(userId, req);
        return ResponseEntity.accepted().build();
    }

    @Operation(summary = "[INTERNAL] Résoudre les tokens par liste de userIds")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Résolution effectuée")
    })
    @PreAuthorize("hasAuthority('SCOPE_resolve:push_token')")
    @PostMapping("/internal/push-tokens/resolve")
    public ResponseEntity<ResolveTokensResponse> resolve(@RequestBody ResolveTokensRequest req) {
        var map = pushTokenService.resolveTokens(req.getUserIds());
        return ResponseEntity.ok(new ResolveTokensResponse(map));
    }

    @Operation(summary = "[INTERNAL] Désactiver un ou plusieurs tokens")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Token(s) désactivé(s)")
    })
    @PreAuthorize("hasAuthority('SCOPE_deactivate:push_token')")
    @PostMapping("/internal/push-tokens/deactivate")
    public ResponseEntity<Void> deactivate(@Valid @RequestBody DeactivatePushTokenRequest req) {
        pushTokenService.deactivateByTokens(req.getTokens());
        return ResponseEntity.noContent().build();
    }
}