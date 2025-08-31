package com.blockout.workernotifications.controllers.v1;

import com.blockout.workernotifications.models.dto.pushTokens.RegisterPushTokenRequest;
import com.blockout.workernotifications.services.PushTokenService;

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
}