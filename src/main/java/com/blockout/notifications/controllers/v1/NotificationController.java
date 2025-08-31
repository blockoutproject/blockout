package com.blockout.notifications.controllers.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.*;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.blockout.notifications.models.UserNotification;
import com.blockout.notifications.models.dto.notifications.UnreadCountDto;
import com.blockout.notifications.services.UserNotificationService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final UserNotificationService userNotificationService;

    @Operation(summary = "List user notifications (paged)")
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Notifications list"))
    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<Page<UserNotification>> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String auth0Id = jwt.getSubject();
        return ResponseEntity.ok(userNotificationService.listNotificationsByAuth0Id(auth0Id, page, size));
    }

    @Operation(summary = "Unread notifications count")
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Unread count"))
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountDto> unreadCount(@AuthenticationPrincipal Jwt jwt) {
        String auth0Id = jwt.getSubject();
        long count = userNotificationService.unreadCountByAuth0Id(auth0Id);
        return ResponseEntity.ok(new UnreadCountDto(count));
    }

    @Operation(summary = "Mark notification as READ")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Marked"),
            @ApiResponse(responseCode = "404", description = "Not found")
    })
    @PreAuthorize("isAuthenticated()")
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
    @PreAuthorize("isAuthenticated()")
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
    @PreAuthorize("isAuthenticated()")
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