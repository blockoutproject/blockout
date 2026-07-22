package com.blockout.notifications.notification.application.commands;

import com.blockout.notifications.notification.application.models.DevicePlatform;

/**
 * Carries one push-token registration request into the application layer.
 */
public record RegisterPushTokenCommand(String expoPushToken, DevicePlatform platform, String deviceId) {
}
