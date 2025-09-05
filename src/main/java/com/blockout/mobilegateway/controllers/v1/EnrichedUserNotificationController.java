package com.blockout.mobilegateway.controllers.v1;

import com.blockout.mobilegateway.models.dto.notifications.EnrichedUserNotificationPageDTO;
import com.blockout.mobilegateway.services.EnrichedUserNotificationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.*;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/enriched-notifications")
public class EnrichedUserNotificationController {

    private final EnrichedUserNotificationService enrichedUserNotificationService;

    @Operation(summary = "Lister les notifications enrichies", description = "Retourne les notifications de l'utilisateur enrichies (logo division) avec pagination simple.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Page de notifications enrichies")
    })
    @GetMapping
    public ResponseEntity<EnrichedUserNotificationPageDTO> getEnrichedNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        EnrichedUserNotificationPageDTO dto = enrichedUserNotificationService.getEnrichedNotifications(page, size);
        return ResponseEntity.ok(dto);
    }
}