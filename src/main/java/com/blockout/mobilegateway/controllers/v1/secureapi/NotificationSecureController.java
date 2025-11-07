package com.blockout.mobilegateway.controllers.v1.secureapi;

import com.blockout.mobilegateway.models.dto.notification.EnrichedUserNotificationPageDTO;
import com.blockout.mobilegateway.models.dto.notification.RegisterPushTokenRequestDTO;
import com.blockout.mobilegateway.models.dto.notification.UnreadCountDTO;
import com.blockout.mobilegateway.services.NotificationService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/secure/notifications")
public class NotificationSecureController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<EnrichedUserNotificationPageDTO> getEnrichedNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var dto = notificationService.getNotifications(page, size);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountDTO> getUnreadNotificationsCount() {
        var dto = notificationService.getUnreadNotificationsCount();
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markNotificationRead(@PathVariable Long id) {
        notificationService.markNotificationRead(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/opened")
    public ResponseEntity<Void> markNotificationOpened(@PathVariable Long id) {
        notificationService.markNotificationOpened(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/users/{userId}/push-tokens")
    public ResponseEntity<Void> registerPushToken(
            @PathVariable Long userId,
            @Valid @RequestBody RegisterPushTokenRequestDTO req) {
        notificationService.registerPushToken(userId, req);
        return ResponseEntity.accepted().build();
    }
}