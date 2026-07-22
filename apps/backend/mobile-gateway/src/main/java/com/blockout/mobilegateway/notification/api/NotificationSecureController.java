package com.blockout.mobilegateway.notification.api;

import com.blockout.mobilegateway.api.NotificationSecureApi;
import com.blockout.mobilegateway.api.models.NotificationPageResponse;
import com.blockout.mobilegateway.api.models.RegisterPushTokenRequest;
import com.blockout.mobilegateway.api.models.UnreadCountResponse;
import com.blockout.mobilegateway.notification.application.NotificationApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Exposes secured Notification operations through the generated mobile contract. */
@RestController
@RequiredArgsConstructor
public class NotificationSecureController implements NotificationSecureApi {

    private final NotificationApplicationService notificationService;
    private final NotificationApiMapper mapper;

    @Override
    public ResponseEntity<NotificationPageResponse> getNotifications(Integer page, Integer size) {
        return ResponseEntity.ok(mapper.toResponse(notificationService.getNotifications(page, size)));
    }

    @Override
    public ResponseEntity<UnreadCountResponse> getUnreadNotificationsCount() {
        return ResponseEntity.ok(mapper.toResponse(notificationService.getUnreadNotificationsCount()));
    }

    @Override
    public ResponseEntity<Void> markNotificationRead(Long id) {
        notificationService.markNotificationRead(id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> markNotificationOpened(Long id) {
        notificationService.markNotificationOpened(id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> deleteNotification(Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> registerPushToken(Long userId, RegisterPushTokenRequest request) {
        notificationService.registerPushToken(userId, mapper.toCommand(request));
        return ResponseEntity.accepted().build();
    }
}
