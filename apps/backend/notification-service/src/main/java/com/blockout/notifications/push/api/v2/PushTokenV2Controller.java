package com.blockout.notifications.push.api.v2;

import com.blockout.notifications.generated.api.NotificationPushTokensApi;
import com.blockout.notifications.generated.model.RegisterPushTokenInternalRequest;
import com.blockout.notifications.push.application.PushTokenRegistration;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

/** Implements the generated push-token boundary without changing caller-selected identity. */
@RestController
@RequiredArgsConstructor
public class PushTokenV2Controller implements NotificationPushTokensApi {

    private final PushTokenRegistration registration;
    private final PushTokenApiMapper mapper;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:current_user')")
    public ResponseEntity<Void> registerUserPushToken(
            Long userId,
            RegisterPushTokenInternalRequest request) {
        registration.register(mapper.toCommand(userId, request));
        return ResponseEntity.accepted().build();
    }
}
