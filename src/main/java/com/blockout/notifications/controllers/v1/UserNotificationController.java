package com.blockout.notifications.controllers.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.*;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @GetMapping
    public ResponseEntity<UserNotificationPageDTO> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UserNotificationPageDTO dto = userNotificationService.getNotificationsByAuth0Id(page, size);
        return ResponseEntity.ok(dto);
    }

    @Operation(summary = "Unread notifications count")
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Unread count"))
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountDTO> unreadCount() {
        long count = userNotificationService.unreadCount();
        return ResponseEntity.ok(new UnreadCountDTO(count));
    }

    @Operation(summary = "Mark notification as READ")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Marked"),
            @ApiResponse(responseCode = "404", description = "Not found")
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        return userNotificationService.markRead(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @Operation(summary = "Mark notification as OPENED")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Marked"),
            @ApiResponse(responseCode = "404", description = "Not found")
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @PostMapping("/{id}/opened")
    public ResponseEntity<Void> markOpened(@PathVariable Long id) {
        return userNotificationService.markOpened(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @Operation(summary = "Delete a notification")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Deleted"),
            @ApiResponse(responseCode = "404", description = "Not found")
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return userNotificationService.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}