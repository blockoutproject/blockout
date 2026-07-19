package com.blockout.notifications.notification.application.commands;

import com.blockout.notifications.notification.application.models.DevicePlatform;

public record RegisterPushTokenCommand(String expoPushToken, DevicePlatform platform, String deviceId) {}
