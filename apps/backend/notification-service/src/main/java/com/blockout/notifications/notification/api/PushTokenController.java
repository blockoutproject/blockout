package com.blockout.notifications.notification.api;

import com.blockout.notifications.notification.api.mappers.NotificationApiMapper;
import com.blockout.notifications.notification.api.models.RegisterPushTokenInternalRequest;
import com.blockout.notifications.notification.application.PushTokenApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

/**
 * Implements the generated V1 internal push-token API.
 */
@RestController
@RequiredArgsConstructor
public class PushTokenController implements PushTokenApi {

    private final PushTokenApplicationService pushTokenService;
    private final NotificationApiMapper mapper;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:current_user')")
    public ResponseEntity<Void> registerPushToken(
        Long userId,
        RegisterPushTokenInternalRequest request) {
        pushTokenService.register(userId, mapper.toCommand(request));
        return ResponseEntity.accepted().build();
    }
}
