package com.blockout.notifications.controllers.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.*;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.blockout.notifications.models.dto.notifications.UserNotificationPageDTO;
import com.blockout.notifications.models.dto.notifications.UnreadCountDTO;
import com.blockout.notifications.services.UserNotificationService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/notifications")
public class UserNotificationController {

    private final UserNotificationService userNotificationService;

    @Operation(summary = "Lister les notifications", description = "Retourne les notifications de l'utilisateur connecté avec pagination simple.")
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Liste de notifications"))
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @GetMapping
    public ResponseEntity<UserNotificationPageDTO> getNotifications(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String auth0Id = jwt.getSubject();
        UserNotificationPageDTO dto = userNotificationService.getNotificationsByAuth0Id(auth0Id, page, size);
        return ResponseEntity.ok(dto);
    }

    @Operation(summary = "Unread notifications count")
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Unread count"))
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountDTO> unreadCount(@AuthenticationPrincipal Jwt jwt) {
        String auth0Id = jwt.getSubject();
        long count = userNotificationService.unreadCountByAuth0Id(auth0Id);
        return ResponseEntity.ok(new UnreadCountDTO(count));
    }

    @Operation(summary = "Mark notification as READ")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Marked"),
            @ApiResponse(responseCode = "404", description = "Not found")
    })
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id) {
        String auth0Id = jwt.getSubject();
        return userNotificationService.markReadByAuth0Id(auth0Id, id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @Operation(summary = "Mark notification as OPENED")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Marked"),
            @ApiResponse(responseCode = "404", description = "Not found")
    })
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @PostMapping("/{id}/opened")
    public ResponseEntity<Void> markOpened(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id) {
        String auth0Id = jwt.getSubject();
        return userNotificationService.markOpenedByAuth0Id(auth0Id, id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @Operation(summary = "Delete a notification")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Deleted"),
            @ApiResponse(responseCode = "404", description = "Not found")
    })
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id) {
        String auth0Id = jwt.getSubject();
        return userNotificationService.deleteByAuth0Id(auth0Id, id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}