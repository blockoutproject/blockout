package com.blockout.notifications.push.application;

import com.blockout.shared.model.DevicePlatformEnum;

/** Carries one Blockout push-token registration intent. */
public record RegisterPushTokenCommand(
        Long userId,
        String expoPushToken,
        DevicePlatformEnum platform,
        String deviceId) {
}
