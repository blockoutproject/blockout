package com.blockout.notifications.notification.api.models;

import com.blockout.notifications.notification.application.models.DevicePlatform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RegisterPushTokenInternalRequest(
    @NotBlank String expoPushToken,
    @NotNull DevicePlatform platform,
    String deviceId) {
}
