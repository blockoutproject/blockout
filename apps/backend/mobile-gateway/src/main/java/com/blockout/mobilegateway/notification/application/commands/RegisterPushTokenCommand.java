package com.blockout.mobilegateway.notification.application.commands;

import com.blockout.mobilegateway.shared.application.models.DevicePlatform;

/** Values accepted when registering a mobile push token. */
public record RegisterPushTokenCommand(String expoPushToken, DevicePlatform platform, String deviceId) {
}
