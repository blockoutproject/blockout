package com.blockout.notifications.inbox.api.v1;

import com.blockout.notifications.inbox.application.NotificationInboxQuery;
import com.blockout.notifications.models.dto.notifications.UnreadCountDTO;
import com.blockout.notifications.services.UserNotificationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Adapts the retained v1 inbox contract to separated application roles. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/notifications")
public class LegacyUserNotificationController {

    private final NotificationInboxQuery inbox;
    private final LegacyNotificationMapper mapper;
    private final LegacyNotificationsJson json;
    private final UserNotificationService mutations;

    /** Preserves the v1 query names, wrapper, ordering, and continuation behavior. */
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(mapper.toResponse(inbox.listLegacy(page, size))));
    }

    /** Retains the existing unread response until MRG-365 migrates it. */
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountDTO> unreadCount() {
        return ResponseEntity.ok(new UnreadCountDTO(mutations.unreadCount()));
    }

    /** Retains the existing state-sensitive read result until MRG-365. */
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        return mutations.markRead(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    /** Retains the existing state-sensitive opened result until MRG-365. */
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @PostMapping("/{id}/opened")
    public ResponseEntity<Void> markOpened(@PathVariable Long id) {
        return mutations.markOpened(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    /** Retains the existing ownership-scoped delete result until MRG-365. */
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return mutations.delete(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
