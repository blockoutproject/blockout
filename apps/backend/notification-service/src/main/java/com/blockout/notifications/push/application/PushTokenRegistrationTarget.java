package com.blockout.notifications.push.application;

/** Identifies one existing registration needed by the application decision. */
public record PushTokenRegistrationTarget(Long id, Long userId, String deviceId) {
}
