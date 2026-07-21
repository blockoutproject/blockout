package com.blockout.notifications.notification.api;

import com.blockout.notifications.notification.api.mappers.NotificationApiMapper;
import com.blockout.notifications.notification.api.models.RegisterPushTokenInternalRequest;
import com.blockout.notifications.notification.application.PushTokenApplicationService;
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
@RequestMapping("/api/v1/notifications")
public class PushTokenController {

    private final PushTokenApplicationService pushTokenService;
    private final NotificationApiMapper mapper;

    @Operation(summary = "Enregistrer / mettre à jour un push token")
    @ApiResponses({
        @ApiResponse(responseCode = "202", description = "Token enregistré/actualisé"),
        @ApiResponse(responseCode = "404", description = "Utilisateur introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_update:current_user')")
    @PostMapping("/users/{userId}/push-tokens")
    public ResponseEntity<Void> register(
        @PathVariable Long userId,
        @Valid @RequestBody RegisterPushTokenInternalRequest request) {
        pushTokenService.register(userId, mapper.toCommand(request));
        return ResponseEntity.accepted().build();
    }
}
