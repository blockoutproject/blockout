package com.blockout.notifications.notification.api;

import com.blockout.notifications.notification.api.mappers.NotificationApiMapper;
import com.blockout.notifications.notification.api.models.NotificationPageInternalResponse;
import com.blockout.notifications.notification.api.models.UnreadCountInternalResponse;
import com.blockout.notifications.notification.application.UserNotificationApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

/**
 * Implements the generated V1 internal Notification API.
 */
@RestController
@RequiredArgsConstructor
public class UserNotificationController implements NotificationApi {

    private final UserNotificationApplicationService userNotificationService;
    private final NotificationApiMapper mapper;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    public ResponseEntity<NotificationPageInternalResponse> listNotifications(Integer page, Integer size) {
        return ResponseEntity.ok(mapper.toResponse(userNotificationService.getNotifications(page, size)));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    public ResponseEntity<UnreadCountInternalResponse> getUnreadCount() {
        long count = userNotificationService.unreadCount();
        return ResponseEntity.ok(new UnreadCountInternalResponse(count));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    public ResponseEntity<Void> markNotificationRead(Long id) {
        return userNotificationService.markRead(id)
            ? ResponseEntity.noContent().build()
            : ResponseEntity.notFound().build();
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    public ResponseEntity<Void> markNotificationOpened(Long id) {
        return userNotificationService.markOpened(id)
            ? ResponseEntity.noContent().build()
            : ResponseEntity.notFound().build();
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    public ResponseEntity<Void> deleteNotification(Long id) {
        return userNotificationService.delete(id)
            ? ResponseEntity.noContent().build()
            : ResponseEntity.notFound().build();
    }
}
