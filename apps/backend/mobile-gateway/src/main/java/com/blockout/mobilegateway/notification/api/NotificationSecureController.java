package com.blockout.mobilegateway.notification.api;

import com.blockout.mobilegateway.notification.api.models.NotificationPageResponse;
import com.blockout.mobilegateway.notification.api.models.RegisterPushTokenRequest;
import com.blockout.mobilegateway.notification.api.models.UnreadCountResponse;
import com.blockout.mobilegateway.notification.application.NotificationApplicationService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/secure/notifications")
public class NotificationSecureController {

    private final NotificationApplicationService notificationService;

    @GetMapping
    public ResponseEntity<NotificationPageResponse> getEnrichedNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var dto = notificationService.getNotifications(page, size);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> getUnreadNotificationsCount() {
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
            @Valid @RequestBody RegisterPushTokenRequest req) {
        notificationService.registerPushToken(userId, req);
        return ResponseEntity.accepted().build();
    }
}