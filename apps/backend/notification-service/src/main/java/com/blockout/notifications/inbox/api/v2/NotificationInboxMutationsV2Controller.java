package com.blockout.notifications.inbox.api.v2;

import com.blockout.notifications.generated.api.NotificationInboxMutationsApi;
import com.blockout.notifications.generated.model.UnreadNotificationCountInternalResponse;
import com.blockout.notifications.inbox.application.NotificationInboxMutations;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

/** Implements the generated current-user inbox mutation family. */
@RestController
@RequiredArgsConstructor
public class NotificationInboxMutationsV2Controller implements NotificationInboxMutationsApi {

    private final NotificationInboxMutations inbox;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    public ResponseEntity<UnreadNotificationCountInternalResponse> getCurrentUserUnreadNotificationCount() {
        return ResponseEntity.ok(new UnreadNotificationCountInternalResponse(inbox.unreadCount()));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    public ResponseEntity<Void> markCurrentUserNotificationRead(Long id) {
        return changed(inbox.markRead(id));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    public ResponseEntity<Void> markCurrentUserNotificationOpened(Long id) {
        return changed(inbox.markOpened(id));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    public ResponseEntity<Void> deleteCurrentUserNotification(Long id) {
        return changed(inbox.delete(id));
    }

    private ResponseEntity<Void> changed(boolean changed) {
        return changed ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
