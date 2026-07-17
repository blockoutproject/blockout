package com.blockout.notifications.controllers.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.blockout.notifications.inbox.api.v1.LegacyNotificationsJson;
import com.blockout.notifications.inbox.api.v1.LegacyRegisterPushTokenRequest;
import com.blockout.notifications.inbox.api.v1.LegacyNotificationMapper;
import com.blockout.notifications.push.application.PushTokenRegistration;
import com.fasterxml.jackson.core.JsonProcessingException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/notifications")
public class PushTokenController {

    private final PushTokenRegistration registration;
    private final LegacyNotificationsJson json;
    private final LegacyNotificationMapper mapper;

    @Operation(summary = "Enregistrer / mettre à jour un push token")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Token enregistré/actualisé"),
            @ApiResponse(responseCode = "404", description = "Utilisateur introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_update:current_user')")
    @PostMapping(value = "/users/{userId}/push-tokens", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> register(
            @PathVariable Long userId,
            @RequestBody String body) throws JsonProcessingException {
        LegacyRegisterPushTokenRequest request = json.readPushToken(body);
        registration.register(mapper.toCommand(userId, request));
        return ResponseEntity.accepted().build();
    }
}
